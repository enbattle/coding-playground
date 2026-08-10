import { expect, test } from '@playwright/test';
import { runCommand, waitForMonaco } from './helpers';

declare global {
  interface Window {
    __cpEditor?: { getModel(): { canUndo(): boolean; getValue(): string } | null };
  }
}

test.describe('onboarding examples', () => {
  test('loading the zod example populates the editor and runs successfully', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await runCommand(page, 'zod');
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('safeParse');

    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(page.getByText('Valid input accepted: true')).toBeVisible();
    await expect(page.getByText('Invalid input rejected: false')).toBeVisible();
  });

  test('loading an example stays undoable (pushEditOperations, not setValue)', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    const canUndoBefore = await page.evaluate(() => window.__cpEditor?.getModel()?.canUndo());
    expect(canUndoBefore).toBe(false);

    await runCommand(page, 'array pipeline');
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('sumOfSquaresOfEvens');

    // MonacoEditor.tsx applies external content changes (like this one) via
    // model.pushEditOperations rather than model.setValue() specifically so this stays true —
    // setValue() would have reset the undo stack and made the load an irreversible action.
    const canUndoAfter = await page.evaluate(() => window.__cpEditor?.getModel()?.canUndo());
    expect(canUndoAfter).toBe(true);
  });
});
