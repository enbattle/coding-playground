import { expect, test } from '@playwright/test';
import { setEditorContent, waitForMonaco } from './helpers';

test.describe('persistence and sharing', () => {
  test('autosaves editor content across reload', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const AUTOSAVE = "e2e-marker";\n');
    await page.waitForTimeout(300);

    await page.reload();
    await waitForMonaco(page);
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('e2e-marker');
  });

  test('a share link reproduces the code in a fresh page with the hash stripped', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const SHARED = "share-e2e-marker";\n');

    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain('#');

    const freshPage = await context.newPage();
    await freshPage.goto(shareUrl);
    await waitForMonaco(freshPage);
    await expect(freshPage.locator('.monaco-editor .view-lines')).toContainText('share-e2e-marker');
    expect(new URL(freshPage.url()).hash).toBe('');
    await freshPage.close();
  });

  test('opening a share link over existing work asks first and saves that work', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const SHARED = "incoming-marker";\n');
    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());

    // Same browser profile (shared localStorage) now holds different, unsaved-to-a-snapshot work.
    await page.keyboard.press('Escape');
    await setEditorContent(page, 'const MINE = "precious-work";\n');
    await page.waitForTimeout(300);

    const receiver = await context.newPage();
    await receiver.goto(shareUrl);
    const prompt = receiver.getByRole('dialog', { name: 'Open shared code?' });
    await expect(prompt).toBeVisible();
    await expect(receiver.locator('.monaco-editor .view-lines')).toContainText('precious-work');

    await prompt.getByRole('button', { name: 'Open shared code' }).click();
    await expect(receiver.locator('.monaco-editor .view-lines')).toContainText('incoming-marker');

    await receiver.getByRole('button', { name: '⇪ Share' }).click();
    await receiver.getByRole('button', { name: 'Load', exact: true }).first().click();
    await expect(receiver.locator('.monaco-editor .view-lines')).toContainText('precious-work');
    await receiver.close();
  });

  test('full browser storage shows a warning instead of silently not saving', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    // Fill the origin's localStorage quota: big chunks first, then ever-smaller ones, each size
    // repeated until refused, so not even a small write fits afterwards.
    await page.evaluate(() => {
      let key = 0;
      for (let size = 256 * 1024; size >= 1; size = Math.floor(size / 2)) {
        for (;;) {
          try {
            localStorage.setItem(`e2e-filler-${key++}`, 'x'.repeat(size));
          } catch {
            break;
          }
        }
      }
    });

    // Bigger than what's already stored: overwriting a key with a smaller value needs no new space.
    await setEditorContent(page, `const unsaved = "${'storage-full '.repeat(200)}";\n`);
    // Filtered: Monaco has its own (empty) role="alert" live regions.
    await expect(
      page.getByRole('alert').filter({ hasText: "Changes aren't being saved" }),
    ).toBeVisible();
  });

  test('saved playgrounds: save, persist, load, and delete', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const SAVED = "saved-e2e-marker";\n');

    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByPlaceholder('Name this snapshot…').fill('E2E Snapshot');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('E2E Snapshot')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.reload();
    await waitForMonaco(page);
    await page.getByRole('button', { name: '⇪ Share' }).click();
    await expect(page.getByText('E2E Snapshot')).toBeVisible();
    await page.keyboard.press('Escape');

    await setEditorContent(page, 'console.log("something else")\n');
    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Load', exact: true }).click();
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('saved-e2e-marker');

    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Delete E2E Snapshot' }).click();
    await expect(page.getByText('No saved playgrounds yet.')).toBeVisible();
  });
});
