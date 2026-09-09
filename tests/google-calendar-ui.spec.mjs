import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 800 },
];

function storedEnvelope() {
  return {
    version: 2,
    credentials: [
      {
        id: 'test:az104',
        credentialDefinitionId: 'cert.azure-administrator-associate',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'Microsoft Certified: Azure Administrator Associate',
        firstEarnedOn: '2025-03-15',
        currentExpiresOn: '2027-03-15',
        confirmedAt: '2026-09-08T00:00:00.000Z',
        lastTranscriptConfirmedOn: '2026-09-08',
        manualOverrideAt: null,
        archivedAt: null,
      },
    ],
    history: [],
  };
}

for (const viewport of viewports) {
  test(`${viewport.name}: Google Calendar sync setup remains usable without OAuth config`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript((data) => {
      window.localStorage.setItem('ms-credentials-tracker:credentials:v2', JSON.stringify(data));
    }, storedEnvelope());
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Googleカレンダー' });
    await expect(trigger).toBeVisible();
    await expect(page.getByRole('banner').getByText('未同期', { exact: true })).toBeVisible();
    await expect(page.getByLabel('今月と予定').getByText('未同期', { exact: true })).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Googleカレンダー同期' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('1資格 · 2予定')).toBeVisible();
    await expect(dialog.getByText('28日前・7日前・当日')).toBeVisible();
    await expect(dialog.getByText('VITE_GOOGLE_CLIENT_ID')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Googleカレンダーと同期' })).toBeDisabled();

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test('marks cleanup as unsynchronized when the last desired Calendar events disappear', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v2',
      JSON.stringify({ version: 2, credentials: [], history: [] }),
    );
    window.localStorage.setItem(
      'ms-credentials-tracker:google-calendar:v1',
      JSON.stringify({
        version: 1,
        calendarId: 'calendar-created-by-app',
        lastSyncedAt: '2026-09-01T00:00:00.000Z',
        lastResult: { created: 2, updated: 0, deleted: 0, unchanged: 0 },
        lastDesiredFingerprint: 'previous-non-empty-desired-state',
      }),
    );
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'カレンダーを更新' })).toBeVisible();
  await expect(page.getByRole('banner').getByText('未同期', { exact: true })).toBeVisible();
});
