import { expect, test } from '@playwright/test';
import { getEditorText, runCommand, setEditorContent, waitForMonaco } from './helpers';

test.describe('editor and execution', () => {
  test('typing code and running it shows console output', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'console.log("hello from e2e")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(page.getByText('hello from e2e')).toBeVisible();
  });

  test('Format Document reformats via Prettier', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, "const x={a:1,b:2}\nconsole.log('done')");
    await runCommand(page, 'format');
    await page.waitForTimeout(300);

    const text = await getEditorText(page);
    expect(text).toContain('const x = { a: 1, b: 2 };');
    expect(text).toContain("console.log('done');");
  });

  test('Clear Console empties the console panel', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'console.log("will be cleared")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(page.getByText('will be cleared')).toBeVisible();

    await runCommand(page, 'clear');
    await expect(page.getByText('Run your code to see output here.')).toBeVisible();
  });

  test('a runtime error surfaces in the console', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'throw new Error("boom from e2e")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(page.getByText('boom from e2e', { exact: false })).toBeVisible();
  });
});
