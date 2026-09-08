import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeTranscriptDate,
  parseMicrosoftLearnTranscript,
} from '../src/domain/transcript-import.ts';
import {
  MAX_TRANSCRIPT_PDF_BYTES,
  validateTranscriptPdfFile,
} from '../src/domain/transcript-pdf.ts';

test('normalizes Microsoft Learn transcript date formats including Japanese dates', () => {
  assert.equal(normalizeTranscriptDate('Mar 14, 2026'), '2026-03-14');
  assert.equal(normalizeTranscriptDate('31 Oct 2025'), '2025-10-31');
  assert.equal(normalizeTranscriptDate('2025 年 11 月 17 日'), '2025-11-17');
  assert.equal(normalizeTranscriptDate('N/A'), null);
  assert.equal(normalizeTranscriptDate('該当なし'), null);
});

test('validates Transcript PDF file metadata conservatively', () => {
  assert.deepEqual(
    validateTranscriptPdfFile({ name: 'transcript.pdf', type: 'application/pdf', size: 1024 }),
    { ok: true },
  );
  assert.deepEqual(
    validateTranscriptPdfFile({ name: 'transcript.PDF', type: '', size: 1024 }),
    { ok: true },
  );
  assert.deepEqual(
    validateTranscriptPdfFile({ name: 'transcript.txt', type: 'text/plain', size: 1024 }),
    { ok: false, error: 'notPdf' },
  );
  assert.deepEqual(
    validateTranscriptPdfFile({
      name: 'transcript.pdf',
      type: 'application/pdf',
      size: MAX_TRANSCRIPT_PDF_BYTES + 1,
    }),
    { ok: false, error: 'tooLarge' },
  );
});

test('parses certification, exam, and Applied Skills records from transcript text', () => {
  const transcript = `
    Applied Skills
    Applied Skills Title
    Microsoft Applied Skills: Configure secure access to your workloads using Azure networking
    Credential number: D3268DD34CD3BB76
    Earned on: Nov 25, 2023

    Active certifications
    Certification title Certification number Earned on Expires on
    Microsoft Certified: Azure Administrator Associate BFC4DD-8BDAB2 Mar 14, 2026 Mar 15, 2027

    Passed exams
    Exam title Exam number Passed date
    Microsoft Azure Administrator AZ-104 Mar 14, 2026
  `;

  const result = parseMicrosoftLearnTranscript(transcript);
  assert.equal(result.credentials.length, 2);
  assert.equal(result.exams.length, 1);

  const certification = result.credentials.find((item) => item.kind === 'certification');
  assert.deepEqual(certification, {
    kind: 'certification',
    detectedTitle: 'Microsoft Certified: Azure Administrator Associate',
    externalNumber: 'BFC4DD-8BDAB2',
    earnedOn: '2026-03-14',
    expiresOn: '2027-03-15',
    matchedDefinitionId: 'cert.azure-administrator-associate',
    matchStatus: 'matched',
  });

  const appliedSkill = result.credentials.find((item) => item.kind === 'appliedSkill');
  assert.equal(
    appliedSkill?.matchedDefinitionId,
    'applied-skill.secure-azure-workloads-networking',
  );
  assert.equal(appliedSkill?.expiresOn, null);

  assert.deepEqual(result.exams[0], {
    title: 'Microsoft Azure Administrator',
    examNumber: 'AZ-104',
    passedOn: '2026-03-14',
  });
});

test('parses localized date labels and tolerates PDF column text around a known title', () => {
  const transcript = `
    有効な認定資格
    認定資格タイトル 資格証明番号 取得日 有効期限
    Microsoft Certified: Azure Administrator Associate BFC4DD-8BDAB2
    取得日: 2025 年 11 月 17 日 有効期限: 2026 年 11 月 18 日

    合格した試験
    試験タイトル 試験番号 合格日
    Microsoft Azure Administrator AZ-104 2025 年 11 月 17 日
  `;

  const result = parseMicrosoftLearnTranscript(transcript);
  assert.equal(result.credentials.length, 1);
  assert.equal(result.credentials[0].detectedTitle, 'Microsoft Certified: Azure Administrator Associate');
  assert.equal(result.credentials[0].earnedOn, '2025-11-17');
  assert.equal(result.credentials[0].expiresOn, '2026-11-18');
  assert.equal(result.credentials[0].matchStatus, 'matched');
  assert.equal(result.exams.length, 1);
  assert.equal(result.exams[0].examNumber, 'AZ-104');
  assert.equal(result.exams[0].passedOn, '2025-11-17');
});

test('keeps unknown credentials unresolved instead of inventing a definition', () => {
  const result = parseMicrosoftLearnTranscript(`
    Active certifications
    Microsoft Certified: Example Future Credential ABCD12-EFGH34 Sep 8, 2026 Sep 9, 2027
  `);

  assert.equal(result.credentials.length, 1);
  assert.equal(result.credentials[0].matchStatus, 'unresolved');
  assert.equal(result.credentials[0].matchedDefinitionId, null);
  assert.match(result.warnings.join(' '), /do not match the local credential catalog/i);
});

test('returns a warning for unsupported or malformed text', () => {
  const result = parseMicrosoftLearnTranscript('This is not a Microsoft Learn transcript table.');
  assert.equal(result.credentials.length, 0);
  assert.equal(result.exams.length, 0);
  assert.equal(result.warnings.length, 1);
});
