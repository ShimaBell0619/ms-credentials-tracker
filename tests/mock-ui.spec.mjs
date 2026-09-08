import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 800 },
];

for (const viewport of viewports) {
  test(`${viewport.name}: mock UI renders without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '資格の更新予定' })).toBeVisible();
    await expect(page.getByText('サンプル基準日')).toBeVisible();
    await expect(page.getByText('Mock data')).toBeVisible();
    await expect(page.getByRole('heading', { name: '資格一覧' })).toBeVisible();

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test('status meaning is available as text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('更新可能').first()).toBeVisible();
  await expect(page.getByText('有効').first()).toBeVisible();
  await expect(page.getByText('期限なし')).toBeVisible();
});

test('keyboard focus is visible on the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: '本文へ移動' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
});
