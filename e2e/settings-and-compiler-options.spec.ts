import { expect, test } from '@playwright/test';
import { waitForMonaco } from './helpers';

test.describe('settings persistence', () => {
  test('editor settings persist across reload', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.getByRole('button', { name: 'Open settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await dialog.locator('select').first().selectOption('18');
    await dialog.getByRole('checkbox').first().check(); // Word wrap
    await page.keyboard.press('Escape');

    await page.reload();
    await waitForMonaco(page);
    await page.getByRole('button', { name: 'Open settings' }).click();
    const reopened = page.getByRole('dialog', { name: 'Settings' });
    await expect(reopened.locator('select').first()).toHaveValue('18');
    await expect(reopened.getByRole('checkbox').first()).toBeChecked();
  });

  test('compiler option changes persist across reload and affect diagnostics', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    // An unused local is only flagged once noUnusedLocals is on — a real end-to-end signal that
    // the setting reaches Monaco's language service, not just that a checkbox toggles.
    await page.getByRole('button', { name: '⚙ TS Config' }).click();
    const popover = page.getByRole('dialog', { name: 'TypeScript compiler options' });
    const noUnusedLocals = popover.getByRole('checkbox').nth(3);
    await expect(noUnusedLocals).not.toBeChecked();
    await noUnusedLocals.check();
    await page.keyboard.press('Escape');

    await page.click('.monaco-editor .view-lines');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.insertText('const unused = 1;\nconsole.log("ok")\n');
    await page.getByRole('button', { name: 'Problems', exact: false }).click();
    await expect(page.getByText(/unused/i)).toBeVisible();

    await page.reload();
    await waitForMonaco(page);
    await page.getByRole('button', { name: '⚙ TS Config' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'TypeScript compiler options' })
        .getByRole('checkbox')
        .nth(3),
    ).toBeChecked();
  });
});
