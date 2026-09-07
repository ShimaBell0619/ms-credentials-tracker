import { expect, test } from '@playwright/test';

test('renders the credential dashboard on wide and narrow viewports', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '資格の更新時期を、ひと目で。' })).toBeVisible();
  await expect(
    page.getByText('Azure Administrator Associate', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('Mock data')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: '資格の更新時期を、ひと目で。' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '保有資格' })).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});
