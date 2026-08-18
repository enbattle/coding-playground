import { expect, test } from '@playwright/test';
import { setEditorContent, waitForMonaco } from './helpers';

test.describe('editor intellisense', () => {
  test("hovering a diagnostic shows Monaco's native tooltip, not clipped by the shell layout", async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'const x: number = "not a number";\n');

    const squiggle = page.locator('.squiggly-error').first();
    await expect(squiggle).toBeVisible();
    const box = await squiggle.boundingBox();
    if (!box) throw new Error('squiggle has no bounding box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 0.1);

    const hover = page.locator('.monaco-hover').first();
    await expect(hover).toBeVisible();
    await expect(hover).toContainText("Type 'string' is not assignable to type 'number'");
  });

  test('autocomplete suggests a user-defined symbol while typing', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    // The definition itself doesn't need real per-keystroke typing, only the triggering prefix
    // below does — see this file's second test for why that distinction matters.
    await setEditorContent(
      page,
      'function calculateTotal(a: number, b: number): number {\n  return a + b;\n}\n',
    );
    await page.keyboard.press('End');

    const widget = page.locator('.suggest-widget').first();
    // Monaco's auto-trigger-while-typing only fires on real, discrete keystrokes — bulk-inserted
    // text (this file's `setEditorContent`, and every other spec's) doesn't reliably exercise the
    // same code path. Confirmed the hard way while building this feature: a bulk-insert-based check
    // gave a false positive that masked a real dev-mode-only regression (see AGENTS.md's Monaco
    // notes) until re-tested with actual keystrokes.
    await page.keyboard.type('calc', { delay: 50 });
    await expect(widget).toBeVisible();
    await expect(widget).toContainText('calculateTotal');
  });

  test('autocomplete suggests TypeScript keywords, not just user-defined or global symbols', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    // Content ends exactly where typing should happen, so the cursor is already there — no
    // separate reposition step needed (setPosition() proved unreliable for keeping keyboard focus
    // in sync with the next real keystrokes when tried here).
    await setEditorContent(page, 'function f() {\n  ');

    const widget = page.locator('.suggest-widget').first();
    await page.keyboard.type('ret', { delay: 50 });
    await expect(widget).toBeVisible();
    await expect(widget.locator('.monaco-list-row').first()).toContainText('return');
  });
});
