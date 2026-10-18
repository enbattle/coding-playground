import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
// lz-string is CommonJS; under Playwright's Node ESM loader only the default export is reliable.
import LZString from 'lz-string';
import { setEditorContent, waitForMonaco } from './helpers';

test.describe('accessibility', () => {
  test('main shell has no automatically detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('open notes, with the privacy tooltip showing, have no violations', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await page.getByRole('textbox', { name: 'Notes' }).fill('a note');
    await page.getByRole('button', { name: 'About notes' }).focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    // toBeVisible() is satisfied by an element its container's overflow clips away; hit-test the
    // tooltip's center to prove it's actually on top and on screen.
    const onTop = await page.getByRole('tooltip').evaluate((tip) => {
      const box = tip.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit !== null && tip.contains(hit);
    });
    expect(onTop).toBe(true);

    const results = await new AxeBuilder({ page }).include('section[aria-label="Notes"]').analyze();
    expect(results.violations).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
  });

  test('Welcome modal shows on load, has no violations, and traps focus', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'Welcome' });
    await expect(dialog).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }
    const focusInsideDialog = await dialog.evaluate((node) =>
      node.contains(document.activeElement),
    );
    expect(focusInsideDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Settings modal traps focus, has no violations, and returns focus on close', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.getByRole('button', { name: 'Open settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);

    // Tab well past the number of focusable elements in the dialog — focus must still be
    // somewhere inside it, never escaped to the page behind the backdrop.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
    }
    const focusInsideDialog = await dialog.evaluate((node) =>
      node.contains(document.activeElement),
    );
    expect(focusInsideDialog).toBe(true);

    await page.keyboard.press('Escape');
    const focusReturned = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') === 'Open settings',
    );
    expect(focusReturned).toBe(true);
  });

  test('share-link prompt has no violations, traps focus, and Escape keeps the current code', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);
    await setEditorContent(page, 'const mine = "a11y-own-work";\n');
    await page.waitForTimeout(300);

    const hash = LZString.compressToEncodedURIComponent(
      JSON.stringify({ v: 1, code: 'console.log("shared")', compilerOptions: {} }),
    );
    const receiver = await context.newPage();
    await receiver.goto(`/#${hash}`);
    const dialog = receiver.getByRole('dialog', { name: 'Open shared code?' });
    await expect(dialog).toBeVisible();

    const results = await new AxeBuilder({ page: receiver }).include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);

    for (let i = 0; i < 10; i++) await receiver.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    await receiver.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(receiver.locator('.monaco-editor .view-lines')).toContainText('a11y-own-work');
  });

  test('command palette has no automatically detectable a11y violations', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.getByRole('button', { name: 'Open command palette' }).click();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(results.violations).toEqual([]);
  });

  // Packages, TS Config, and Share are lighter-weight popovers, not full modals (no backdrop, no
  // focus trap — dismissible via outside click) but still use role="dialog" for their content, so
  // still worth a scan. A page-load-time scan of the shell alone never opens these, so they'd
  // otherwise have zero automated a11y coverage.
  for (const { trigger, label } of [
    { trigger: 'Packages', label: 'Available packages' },
    { trigger: '⚙ TS Config', label: 'TypeScript compiler options' },
    { trigger: '⇪ Share', label: 'Share and saved playgrounds' },
  ]) {
    test(`${trigger} popover has no automatically detectable a11y violations`, async ({ page }) => {
      await page.goto('/');
      await waitForMonaco(page);

      await page.getByRole('button', { name: trigger, exact: false }).click();
      await expect(page.getByRole('dialog', { name: label })).toBeVisible();

      const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('narrow viewports show a fallback instead of mounting the editor', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('/');
    await expect(page.getByText(/needs a wider screen/i)).toBeVisible();
    expect(await page.locator('.monaco-editor').count()).toBe(0);
  });
});
