import { expect, test } from '@playwright/test';

test('90-day schedule visibly anchors the current day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v1',
      JSON.stringify({
        version: 1,
        credentials: [
          {
            id: 'test:az900',
            credentialDefinitionId: 'cert.azure-fundamentals',
            source: 'learnTranscriptPdf',
            sourceRecordId: null,
            sourceTitle: 'AZ-900',
            firstEarnedOn: '2025-01-01',
            currentExpiresOn: null,
            confirmedAt: '2026-09-08T00:00:00.000Z',
          },
        ],
      }),
    );
  });
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
