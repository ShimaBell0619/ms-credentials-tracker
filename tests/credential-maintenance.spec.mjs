import { expect, test } from '@playwright/test';

async function freezeDate(page) {
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
}

function pdfEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function buildTextPdf(lines) {
  const content = [
    'BT',
    '/F1 9 Tf',
    '48 770 Td',
    '11 TL',
    ...lines.flatMap((line, index) => [
      `(${pdfEscape(line)}) Tj`,
      ...(index < lines.length - 1 ? ['T*'] : []),
    ]),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n%1234\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

test('stale renewal-window data shows a re-import prompt and opens Transcript import', async ({ page }) => {
  await freezeDate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v2',
      JSON.stringify({
        version: 2,
        history: [],
        credentials: [
          {
            id: 'learn:stale-az104',
            credentialDefinitionId: 'cert.azure-administrator-associate',
            source: 'learnTranscriptPdf',
            sourceRecordId: 'stale-az104',
            sourceTitle: 'Microsoft Certified: Azure Administrator Associate',
            firstEarnedOn: '2025-03-08',
            currentExpiresOn: '2027-03-08',
            confirmedAt: '2026-08-01T00:00:00.000Z',
            lastTranscriptConfirmedOn: '2026-08-01',
            manualOverrideAt: null,
            archivedAt: null,
          },
        ],
      }),
    );
  });

  await page.goto('/');
  const banner = page.locator('.freshness-banner');
  await expect(banner.getByRole('heading', { name: '保存している資格情報を確認してください' })).toBeVisible();
  await expect(banner).toContainText('AZ-104');
  await banner.getByRole('button', { name: 'Transcriptを再インポート' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: '資格情報を取り込む' })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('manual add, edit, archive, and restore controls are not exposed in the current UI', async ({ page }) => {
  await freezeDate(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v2',
      JSON.stringify({
        version: 2,
        history: [],
        credentials: [
          {
            id: 'learn:az104',
            credentialDefinitionId: 'cert.azure-administrator-associate',
            source: 'learnTranscriptPdf',
            sourceRecordId: 'az104',
            sourceTitle: 'Microsoft Certified: Azure Administrator Associate',
            firstEarnedOn: '2025-01-01',
            currentExpiresOn: '2027-01-01',
            confirmedAt: '2026-09-08T00:00:00.000Z',
            lastTranscriptConfirmedOn: '2026-09-08',
            manualOverrideAt: null,
            archivedAt: null,
          },
        ],
      }),
    );
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'データと連携' })).toBeVisible();
  await expect(page.getByRole('button', { name: '手動追加' })).toBeHidden();
  await expect(page.getByRole('button', { name: '資格を追加' })).toBeHidden();
  await expect(page.getByRole('button', { name: '修正' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'アーカイブ' })).toBeHidden();
  await expect(page.getByText('アーカイブ済み')).toHaveCount(0);

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('an unresolved Transcript credential can be explicitly mapped before confirmation', async ({ page }) => {
  await freezeDate(page);
  const transcriptPdf = buildTextPdf([
    'Transcript',
    'Active certifications',
    'Certification title Certification number Earned on Expires on',
    'Microsoft Certified: Contoso Cloud Operator Associate ABCDEF-123456 Mar 14, 2026 Mar 15, 2027',
  ]);

  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Transcript PDF').setInputFiles({
    name: 'unresolved-transcript.pdf',
    mimeType: 'application/pdf',
    buffer: transcriptPdf,
  });
  await dialog.getByRole('button', { name: 'PDFを解析する' }).click();

  await expect(dialog.getByText('未照合', { exact: true }).first()).toBeVisible();
  await dialog.getByLabel('この資格を手動で照合').selectOption('cert.azure-administrator-associate');
  await expect(dialog.getByText('照合済み', { exact: true }).first()).toBeVisible();
  await dialog.getByRole('button', { name: '確認して保存' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.credential-table').getByText('AZ-104')).toBeVisible();
});

test('Transcript reconciliation conflict keeps the modal open and preserves the manual override', async ({ page }) => {
  await freezeDate(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v2',
      JSON.stringify({
        version: 2,
        history: [],
        credentials: [
          {
            id: 'learn:BFC4DD-8BDAB2',
            credentialDefinitionId: 'cert.azure-administrator-associate',
            source: 'manual',
            sourceRecordId: 'BFC4DD-8BDAB2',
            sourceTitle: 'Microsoft Certified: Azure Administrator Associate',
            firstEarnedOn: '2026-03-14',
            currentExpiresOn: '2027-04-01',
            confirmedAt: '2026-09-07T00:00:00.000Z',
            lastTranscriptConfirmedOn: '2026-09-01',
            manualOverrideAt: '2026-09-07T00:00:00.000Z',
            archivedAt: null,
          },
        ],
      }),
    );
  });
  const transcriptPdf = buildTextPdf([
    'Transcript',
    'Active certifications',
    'Certification title Certification number Earned on Expires on',
    'Microsoft Certified: Azure Administrator Associate BFC4DD-8BDAB2 Mar 14, 2026 Mar 15, 2027',
  ]);

  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Transcript PDF').setInputFiles({
    name: 'transcript.pdf',
    mimeType: 'application/pdf',
    buffer: transcriptPdf,
  });
  await dialog.getByRole('button', { name: 'PDFを解析する' }).click();
  await expect(dialog.getByRole('heading', { name: '解析結果' })).toBeVisible();

  await dialog.getByRole('button', { name: '確認して保存' }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('status')).toContainText('1件は手動修正と競合しました');
  await expect(dialog.getByRole('heading', { name: '解析結果' })).toBeVisible();

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('ms-credentials-tracker:credentials:v2')),
  );
  expect(stored.credentials[0].currentExpiresOn).toBe('2027-04-01');
  expect(stored.credentials[0].manualOverrideAt).toBe('2026-09-07T00:00:00.000Z');
});
