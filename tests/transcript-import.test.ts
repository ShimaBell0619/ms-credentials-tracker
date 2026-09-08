import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTranscriptDate, parseMicrosoftLearnTranscript } from '../src/domain/transcript-import.ts';
import { normalizeMicrosoftLearnTranscriptShareUrl } from '../src/domain/transcript-share-url.ts';

test('normalizes Microsoft Learn transcript date formats', () => {
  assert.equal(normalizeTranscriptDate('Mar 14, 2026'), '2026-03-14');
  assert.equal(normalizeTranscriptDate('31 Oct 2025'), '2025-10-31');
  assert.equal(normalizeTranscriptDate('N/A'), null);
});

test('normalizes supported Microsoft Learn transcript share URLs', () => {
  assert.deepEqual(
    normalizeMicrosoftLearnTranscriptShareUrl(
      ' https://learn.microsoft.com/ja-jp/users/12345678/transcript/exampletoken?utm_source=test#fragment ',
    ),
    {
      ok: true,
      url: 'https://learn.microsoft.com/ja-jp/users/12345678/transcript/exampletoken',
    },
  );
  assert.deepEqual(
    normalizeMicrosoftLearnTranscriptShareUrl(
      'https://learn.microsoft.com/users/example-user/transcript/exampletoken',
    ),
    {
      ok: true,
      url: 'https://learn.microsoft.com/users/example-user/transcript/exampletoken',
    },
  );
});

test('rejects non-Microsoft and malformed transcript URLs', () => {
  assert.equal(normalizeMicrosoftLearnTranscriptShareUrl('https://example.com/users/1/transcript/a').ok, false);
  assert.equal(normalizeMicrosoftLearnTranscriptShareUrl('http://learn.microsoft.com/users/1/transcript/a').ok, false);
  assert.equal(normalizeMicrosoftLearnTranscriptShareUrl('https://learn.microsoft.com/users/1/profile').ok, false);
  assert.equal(normalizeMicrosoftLearnTranscriptShareUrl('not a url').ok, false);
});

test('parses certification, exam, and Applied Skills records from copied transcript text', () => {
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
  assert.equal(appliedSkill?.matchedDefinitionId, 'applied-skill.secure-azure-workloads-networking');
  assert.equal(appliedSkill?.expiresOn, null);

  assert.deepEqual(result.exams[0], {
    title: 'Microsoft Azure Administrator',
    examNumber: 'AZ-104',
    passedOn: '2026-03-14',
  });
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
