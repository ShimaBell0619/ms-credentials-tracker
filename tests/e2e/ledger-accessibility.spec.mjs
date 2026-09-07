import { expect, test } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  test(`keeps credential dates, status and keyboard navigation usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const renewal = page.getByRole('region', { name: '次の更新', exact: true });
    const records = page.getByRole('region', { name: '保有資格', exact: true });
    await expect(renewal.getByText('更新可能', { exact: true })).toBeVisible();
    await expect(renewal.locator('time[datetime="2026-10-19"]')).toBeInViewport();
    await expect(renewal.getByText('期限まで 42 日')).toBeVisible();
    await expect(records.getByRole('article')).toHaveCount(4);
    for (const record of await records.getByRole('article').all()) {
      await expect(record.getByText('取得日', { exact: true })).toBeAttached();
      await expect(record.getByText('有効期限', { exact: true })).toBeAttached();
      await expect(record.getByText(/^(更新可能|有効|期限なし)$/).first()).toBeVisible();
      await expect(record.locator('time').first()).toHaveAttribute(
        'datetime',
        /^\d{4}-\d{2}-\d{2}$/,
      );
    }
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
    await expect(page.getByRole('table')).toHaveAccessibleName(
      /7日はサンプル基準日、15日は更新リマインド/,
    );
    await expect(page.getByRole('columnheader')).toHaveCount(7);
    await page.screenshot({ path: testInfo.outputPath(`ledger-${width}.png`), fullPage: true });

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: '資格記録へスキップ' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await expect(skip).toHaveCSS('outline-style', 'solid');
    await skip.press('Enter');
    await expect(records).toBeFocused();
    await page.getByRole('link', { name: '資格記録を見る' }).focus();
    await page.keyboard.press('Enter');
    const target = records.getByRole('article', {
      name: 'Azure Administrator Associate',
      exact: true,
    });
    await expect(target).toBeFocused();
    await expect(target).toHaveCSS('outline-style', 'solid');
    await page.screenshot({ path: testInfo.outputPath(`focus-${width}.png`) });
  });
}
