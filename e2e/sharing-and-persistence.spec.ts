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
