import { expect, test } from '@playwright/test';

test('90-day schedule visibly anchors the current day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const rail = page.locator('.live-timeline-rail');
  await expect(rail).toBeVisible();

  const marker = await rail.evaluate((element) => ({
    lineWidth: getComputedStyle(element, '::before').width,
    label: getComputedStyle(element, '::after').content,
  }));

  expect(marker.lineWidth).toBe('2px');
  expect(marker.label).toContain('今日');

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
