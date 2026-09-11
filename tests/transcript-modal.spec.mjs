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
