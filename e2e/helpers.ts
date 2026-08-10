import type { Page } from '@playwright/test';

/** Selects all and replaces the single-file editor's content. Uses insertText rather than
 * type() — AGENTS.md notes type() can trip Monaco's auto-closing-bracket "type over" detection. */
export async function setEditorContent(page: Page, code: string): Promise<void> {
  await page.click('.monaco-editor .view-lines');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.insertText(code);
}

/** Opens the command palette, filters to a query specific enough to leave exactly one match, and
 * runs it (Enter runs whatever's at activeIndex, which resets to 0 on every query change). */
export async function runCommand(page: Page, filter: string): Promise<void> {
  await page.click('button[aria-label="Open command palette"]');
  await page.keyboard.insertText(filter);
  await page.keyboard.press('Enter');
}

export async function waitForMonaco(page: Page): Promise<void> {
  await page.waitForSelector('.monaco-editor', { timeout: 15_000 });
}

/** Monaco renders some whitespace in its DOM as U+00A0 (non-breaking space) rather than a regular
 * space, which looks identical printed but fails a literal-space substring match — innerText()
 * alone silently produces assertions that only pass by accident (whenever the checked substring
 * has no spaces). Normalizing here is what makes '{ a: 1, b: 2 }'-style assertions reliable. */
export async function getEditorText(page: Page): Promise<string> {
  const raw = await page.locator('.monaco-editor .view-lines').innerText();
  return raw.replace(/ /g, ' ');
}
