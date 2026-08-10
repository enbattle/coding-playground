import { expect, test } from '@playwright/test';
import { waitForMonaco } from './helpers';

test.describe('packages and theming', () => {
  test('packages panel lists curated packages and inserts an import', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.getByRole('button', { name: 'Packages', exact: false }).click();
    await expect(page.getByText('zod')).toBeVisible();

    await page.getByRole('button', { name: 'Insert import' }).first().click();
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('import');
  });

  test('theme switcher changes the active theme', async ({ page }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.getByRole('button', { name: /Instrument Panel/i }).click();
    await page.getByRole('radio', { name: /Terminal Botanical/i }).click();
    await expect(page.getByRole('button', { name: /Terminal Botanical/i })).toBeVisible();
  });

  test('command palette does not list theme-switch commands (the pill is the single source)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMonaco(page);

    await page.click('button[aria-label="Open command palette"]');
    await page.keyboard.insertText('theme');
    await expect(page.getByText('No matching commands.')).toBeVisible();
  });
});
