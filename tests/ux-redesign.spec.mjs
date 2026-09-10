import { expect, test } from '@playwright/test';

test('actionable renewal stays primary when expired credentials also exist', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v1',
      JSON.stringify({
        version: 1,
        credentials: [
          {
            id: 'test:expired-az500',
            credentialDefinitionId: 'cert.azure-security-engineer-associate',
            source: 'learnTranscriptPdf',
            sourceRecordId: null,
            sourceTitle: 'AZ-500',
            firstEarnedOn: '2025-01-01',
            currentExpiresOn: '2026-08-01',
            confirmedAt: '2026-09-08T00:00:00.000Z',
          },
          {
            id: 'test:renewable-az104',
            credentialDefinitionId: 'cert.azure-administrator-associate',
            source: 'learnTranscriptPdf',
            sourceRecordId: null,
            sourceTitle: 'AZ-104',
            firstEarnedOn: '2023-11-19',
            currentExpiresOn: '2026-11-20',
            confirmedAt: '2026-09-08T00:00:00.000Z',
          },
        ],
      }),
    );
  });

  await page.goto('/');

  const primary = page.getByLabel('次に対応が必要な資格');
  await expect(primary.getByText('AZ-104', { exact: true })).toBeVisible();
  await expect(primary.getByText('更新できます', { exact: true })).toBeVisible();
  await expect(page.getByText('期限切れの資格が1件あります。', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: '期限切れの資格があります' })).toHaveCount(0);
});
