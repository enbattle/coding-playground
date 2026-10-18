import { expect, test, type Page } from '@playwright/test';
// lz-string is CommonJS; under Playwright's Node ESM loader only the default export is reliable.
import LZString from 'lz-string';
import { consoleOutput, runCommand, setEditorContent, waitForMonaco } from './helpers';

const notesBox = (page: Page) => page.getByRole('textbox', { name: 'Notes' });
const notesToggle = (page: Page) => page.getByRole('button', { name: 'Notes', exact: true });

async function writeNotes(page: Page, text: string): Promise<void> {
  await notesToggle(page).click();
  await notesBox(page).fill(text);
}

// ADR 0014: notes are private to the browser tab. sessionStorage only, never shared or saved.
test.describe('notes', () => {
  test('start collapsed, and show beside the console while code runs', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await expect(notesToggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(notesBox(page)).toHaveCount(0);

    await writeNotes(page, 'check the greeting');
    await expect(
      page.getByText('Private to this tab: cleared when you close it, never saved or shared.'),
    ).toBeVisible();

    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(consoleOutput(page)).toContainText('Hello, world!');
    await expect(notesBox(page)).toBeVisible();
    await expect(notesBox(page)).toHaveValue('check the greeting');
  });

  test('survive a reload and reopen, but a new tab starts empty', async ({ page, context }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await writeNotes(page, 'reload-survivor');

    await page.reload();
    await waitForMonaco(page);
    await expect(notesBox(page)).toHaveValue('reload-survivor');

    const otherTab = await context.newPage();
    await otherTab.goto('/');
    await waitForMonaco(otherTab);
    await expect(notesToggle(otherTab)).toHaveAttribute('aria-expanded', 'false');
    await notesToggle(otherTab).click();
    await expect(notesBox(otherTab)).toHaveValue('');
    await otherTab.close();
  });

  test('stay out of localStorage, share links and saved playgrounds', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const CODE = "shared-code-marker";\n');
    await writeNotes(page, 'private-notes-marker');

    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    const payload = LZString.decompressFromEncodedURIComponent(new URL(shareUrl).hash.slice(1));
    expect(payload).toContain('shared-code-marker');
    expect(payload).not.toContain('private-notes-marker');

    await page.getByPlaceholder('Name this snapshot…').fill('with notes open');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(300);
    const everythingStored = await page.evaluate(() => Object.values(localStorage).join('\n'));
    expect(everythingStored).toContain('shared-code-marker');
    expect(everythingStored).not.toContain('private-notes-marker');
  });

  test('are kept when an example, a snapshot or a share link replaces the code', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await waitForMonaco(page);
    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    await page.getByPlaceholder('Name this snapshot…').fill('sample');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.keyboard.press('Escape');
    await writeNotes(page, 'still-here');

    await runCommand(page, 'zod');
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('safeParse');
    await expect(notesBox(page)).toHaveValue('still-here');

    await page.getByRole('button', { name: '⇪ Share' }).click();
    await page.getByRole('button', { name: 'Load', exact: true }).first().click();
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('greet');
    await expect(notesBox(page)).toHaveValue('still-here');

    // Same tab, so the same session: the link replaces the code, never the notes. Going via
    // about:blank forces a real load; a hash-only change to the current URL doesn't reload.
    await page.goto('about:blank');
    await page.goto(shareUrl);
    await waitForMonaco(page);
    await expect(notesBox(page)).toHaveValue('still-here');
  });

  test('are removed by Clear local data', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await writeNotes(page, 'clear-me');

    await page.getByRole('button', { name: 'Open settings' }).click();
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Clear local data' }).click();
    await waitForMonaco(page);

    await expect(notesToggle(page)).toHaveAttribute('aria-expanded', 'false');
    await notesToggle(page).click();
    await expect(notesBox(page)).toHaveValue('');
  });
});

test.describe('layout', () => {
  for (const [width, height] of [
    [1280, 800],
    [1920, 1080],
  ] as const) {
    test(`fills a ${width}x${height} window without a page scrollbar`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await waitForMonaco(page);

      const shell = await page.locator('main').boundingBox();
      // The pill above the shell and the stage's padding take ~100px; the rest is the shell's.
      expect(shell!.height).toBeGreaterThan(height - 110);
      expect(shell!.width).toBeGreaterThan(Math.min(width, 1920) - 50);
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
      );
      expect(scrolls).toBe(false);
    });
  }
});
