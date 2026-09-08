import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 800 },
];

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
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

function storedEnvelope() {
  return {
    version: 1,
    credentials: [
      {
        id: 'test:az104',
        credentialDefinitionId: 'cert.azure-administrator-associate',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-104',
        firstEarnedOn: '2023-11-19',
        currentExpiresOn: '2026-11-20',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'test:az305',
        credentialDefinitionId: 'cert.azure-solutions-architect-expert',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-305',
        firstEarnedOn: '2024-06-28',
        currentExpiresOn: '2027-06-29',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'test:az500',
        credentialDefinitionId: 'cert.azure-security-engineer-associate',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-500',
        firstEarnedOn: '2025-01-01',
        currentExpiresOn: '2026-08-01',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'test:az900',
        credentialDefinitionId: 'cert.azure-fundamentals',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-900',
        firstEarnedOn: '2023-07-16',
        currentExpiresOn: null,
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
    ],
  };
}

for (const viewport of viewports) {
  test(`${viewport.name}: empty local-data UI renders without horizontal overflow`, async ({ page }) => {
    await freezeDate(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '資格の更新予定' })).toBeVisible();
    await expect(page.getByText('基準日', { exact: false })).toBeVisible();
    await expect(page.getByText('Local data', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '資格を取り込む' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'まだ資格データがありません' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '資格一覧' })).toBeVisible();

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test('derived status meaning is available as text', async ({ page }) => {
  await freezeDate(page);
  await page.addInitScript((data) => {
    window.localStorage.setItem('ms-credentials-tracker:credentials:v1', JSON.stringify(data));
  }, storedEnvelope());
  await page.goto('/');

  await expect(page.getByText('更新可能').first()).toBeVisible();
  await expect(page.getByText('有効').first()).toBeVisible();
  await expect(page.getByText('期限切れ').first()).toBeVisible();
  await expect(page.getByText('期限なし').first()).toBeVisible();
  await expect(page.getByText('AZ-104 有効期限').first()).toBeVisible();
});

test('90-day month scale uses calendar-day proportions and keeps deadline pins in the correct month', async ({ page }) => {
  await freezeDate(page);
  await page.addInitScript((data) => {
    window.localStorage.setItem('ms-credentials-tracker:credentials:v1', JSON.stringify(data));
  }, storedEnvelope());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const monthLabels = page.locator('.month-scale span');
  const september = await monthLabels.filter({ hasText: '9月' }).boundingBox();
  const october = await monthLabels.filter({ hasText: '10月' }).boundingBox();
  const november = await monthLabels.filter({ hasText: '11月' }).boundingBox();
  const december = await monthLabels.filter({ hasText: '12月' }).boundingBox();
  const deadlinePin = await page.locator('.timeline-pin-deadline').first().boundingBox();

  expect(september).not.toBeNull();
  expect(october).not.toBeNull();
  expect(november).not.toBeNull();
  expect(december).not.toBeNull();
  expect(deadlinePin).not.toBeNull();

  expect(october.width).toBeGreaterThan(september.width);
  expect(november.width).toBeGreaterThan(december.width);

  const pinCenter = deadlinePin.x + deadlinePin.width / 2;
  expect(pinCenter).toBeGreaterThanOrEqual(november.x);
  expect(pinCenter).toBeLessThanOrEqual(november.x + november.width);
});

test('keyboard focus is visible on the skip link', async ({ page }) => {
  await freezeDate(page);
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: '本文へ移動' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
});

test('Transcript PDF import updates the live credential projection and persists locally', async ({ page }) => {
  await freezeDate(page);
  const transcriptPdf = buildTextPdf([
    'Transcript',
    'Active certifications',
    'Certification title Certification number Earned on Expires on',
    'Microsoft Certified: Azure Administrator Associate BFC4DD-8BDAB2 Mar 14, 2026 Mar 15, 2027',
    'Passed exams',
    'Exam title Exam number Passed date',
    'Microsoft Azure Administrator AZ-104 Mar 14, 2026',
  ]);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'まだ資格データがありません' })).toBeVisible();
  await page.getByRole('button', { name: '資格を取り込む' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '資格情報を取り込む' })).toBeVisible();
  await expect(dialog.getByText('外部へアップロードしません')).toBeVisible();

  await dialog.getByLabel('Transcript PDF').setInputFiles({
    name: 'transcript.pdf',
    mimeType: 'application/pdf',
    buffer: transcriptPdf,
  });
  await dialog.getByRole('button', { name: 'PDFを解析する' }).click();

  await expect(dialog.getByRole('heading', { name: '解析結果' })).toBeVisible();
  await expect(dialog.getByText('Import candidates · 1ページ')).toBeVisible();
  await expect(dialog.locator('.candidate-title strong')).toHaveText(
    'Microsoft Certified: Azure Administrator Associate',
  );

  await dialog.getByRole('button', { name: '確認して保存' }).click();
  await expect(dialog.getByText('1件をブラウザに保存しました。')).toBeVisible();
  await expect(page.locator('.saved-count')).toContainText('1');
  await expect(page.locator('.credential-table').getByText('AZ-104')).toBeVisible();
  await expect(page.getByText('AZ-104 更新開始').first()).toBeVisible();

  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('ms-credentials-tracker:credentials:v1')),
  );
  expect(stored.credentials[0].source).toBe('learnTranscriptPdf');

  await page.reload();
  await expect(page.locator('.saved-count')).toContainText('1');
  await expect(page.locator('.credential-table').getByText('AZ-104')).toBeVisible();
});

test('Transcript PDF import rejects non-PDF files', async ({ page }) => {
  await freezeDate(page);
  await page.goto('/');
  await page.getByRole('button', { name: '資格を取り込む' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('Transcript PDF').setInputFiles({
    name: 'transcript.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a pdf'),
  });
  await dialog.getByRole('button', { name: 'PDFを解析する' }).click();

  await expect(dialog.getByRole('alert')).toContainText('PDF ファイルを選択');
  await expect(dialog.getByRole('heading', { name: '解析結果' })).toHaveCount(0);
});
