import { expect, test } from '@playwright/test';
import {
  consoleOutput,
  getEditorText,
  runCommand,
  setEditorContent,
  waitForMonaco,
} from './helpers';

test.describe('editor and execution', () => {
  test('typing code and running it shows console output', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'console.log("hello from e2e")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(consoleOutput(page).getByText('hello from e2e')).toBeVisible();
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
    await expect(consoleOutput(page).getByText('will be cleared')).toBeVisible();

    await runCommand(page, 'clear');
    await expect(consoleOutput(page).getByText('Run your code to see output here.')).toBeVisible();
  });

  test('an infinite loop can be stopped without freezing the page', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'console.log("loop started");\nwhile (true) {}\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    // Only reachable if the page is still processing messages after the loop began — on the old
    // same-thread harness this line is where the test fails.
    await expect(consoleOutput(page).getByText('loop started')).toBeVisible();
    await page.waitForTimeout(1_000);

    await page.getByRole('button', { name: '■ Stop' }).click({ timeout: 5_000 });
    await expect(consoleOutput(page).getByText('Execution stopped.')).toBeVisible();
    await expect(page.getByRole('button', { name: '■ Stop' })).toBeHidden();

    await setEditorContent(page, 'console.log("runs again")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(consoleOutput(page).getByText('runs again')).toBeVisible();
  });

  test('Stop halts a running interval, and Stop shows only while work is pending', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'setInterval(() => console.log("tick"), 100);\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    const ticks = consoleOutput(page).getByText('tick', { exact: true });
    await expect(ticks.nth(2)).toBeVisible();

    await page.getByRole('button', { name: '■ Stop' }).click();
    const ticksAtStop = await ticks.count();
    await page.waitForTimeout(500);
    expect(await ticks.count()).toBe(ticksAtStop);

    await setEditorContent(page, 'console.log("quick")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(consoleOutput(page).getByText('quick')).toBeVisible();
    await expect(page.getByRole('button', { name: '■ Stop' })).toBeHidden();
  });

  test('a flood of console output stays responsive and shows the latest lines', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'for (let i = 0; i < 200000; i++) console.log("n=" + i);\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(consoleOutput(page).getByText('n=199999', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(consoleOutput(page).getByText(/earlier lines not shown/)).toBeVisible();
  });

  test('an endless logging loop can still be stopped', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'while (true) console.log("spam");\n');
    await page.getByRole('button', { name: '▸ Run' }).click();
    await expect(consoleOutput(page).getByText('spam').first()).toBeVisible();
    await page.waitForTimeout(1_000);

    await page.getByRole('button', { name: '■ Stop' }).click({ timeout: 5_000 });
    await expect(consoleOutput(page).getByText('Execution stopped.')).toBeVisible();
  });

  // Runs against the production build on purpose: the formatter's source is embedded into the
  // sandbox via Function.prototype.toString, after minification.
  test('console output shows values JSON would mangle', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'console.log(new Map([["k", 1]]), undefined, 10n);\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(consoleOutput(page)).toContainText('Map(1) {');
    await expect(consoleOutput(page)).toContainText('"k" => 1');
    await expect(consoleOutput(page)).toContainText('} undefined 10n');
  });

  test('a runtime error surfaces in the console', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await setEditorContent(page, 'throw new Error("boom from e2e")\n');
    await page.getByRole('button', { name: '▸ Run' }).click();

    await expect(consoleOutput(page).getByText('boom from e2e', { exact: false })).toBeVisible();
  });
});
