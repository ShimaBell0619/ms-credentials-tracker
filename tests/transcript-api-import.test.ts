import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMicrosoftLearnTranscriptApiPayload } from '../src/domain/transcript-api-import.ts';

test('parses Microsoft Learn transcript API certification, Applied Skill, and exam records', () => {
  const result = parseMicrosoftLearnTranscriptApiPayload(
    JSON.stringify({
      userName: 'ignored-user-field',
      certificationData: {
        activeCertifications: [
          {
            name: 'Azure Administrator Associate',
            certificationNumber: 'BFC4DD-8BDAB2',
            dateEarned: '2026-03-14T00:00:00Z',
            expiration: '2027-03-15T00:00:00Z',
            status: 'Active',
          },
        ],
        passedExams: [
          {
            examTitle: 'Microsoft Azure Administrator',
            examNumber: 'az-104',
            examDateTaken: '2026-03-14T00:00:00Z',
          },
        ],
      },
      appliedSkillsData: {
        appliedSkillsCredentials: [
          {
            title: 'Configure secure access to your workloads using Azure networking',
            credentialId: 'D3268DD34CD3BB76',
            awardedOn: '2023-11-25T12:30:00Z',
          },
        ],
      },
    }),
  );

  assert.ok(result);
  assert.equal(result.credentials.length, 2);
  assert.equal(result.exams.length, 1);

  assert.deepEqual(result.credentials[0], {
    kind: 'certification',
    detectedTitle: 'Microsoft Certified: Azure Administrator Associate',
    externalNumber: 'BFC4DD-8BDAB2',
    earnedOn: '2026-03-14',
    expiresOn: '2027-03-15',
    matchedDefinitionId: 'cert.azure-administrator-associate',
    matchStatus: 'matched',
  });
  assert.deepEqual(result.credentials[1], {
    kind: 'appliedSkill',
    detectedTitle:
      'Microsoft Applied Skills: Configure secure access to your workloads using Azure networking',
    externalNumber: 'D3268DD34CD3BB76',
    earnedOn: '2023-11-25',
    expiresOn: null,
    matchedDefinitionId: 'applied-skill.secure-azure-workloads-networking',
    matchStatus: 'matched',
  });
  assert.deepEqual(result.exams[0], {
    title: 'Microsoft Azure Administrator',
    examNumber: 'AZ-104',
    passedOn: '2026-03-14',
  });
});

test('keeps an unknown API credential unresolved without inventing a definition', () => {
  const result = parseMicrosoftLearnTranscriptApiPayload(
    JSON.stringify({
      certificationData: {
        activeCertifications: [
          {
            name: 'Example Future Credential',
            certificationNumber: 'EXAMPLE-123456',
            dateEarned: '2026-09-08',
            expiration: '2027-09-08',
          },
        ],
      },
    }),
  );

  assert.ok(result);
  assert.equal(result.credentials.length, 1);
  assert.equal(result.credentials[0].detectedTitle, 'Microsoft Certified: Example Future Credential');
  assert.equal(result.credentials[0].matchedDefinitionId, null);
  assert.equal(result.credentials[0].matchStatus, 'unresolved');
  assert.match(result.warnings.join(' '), /do not match the local credential catalog/i);
});

test('recursively finds passedExams while ignoring unrelated personal fields', () => {
  const result = parseMicrosoftLearnTranscriptApiPayload(
    JSON.stringify({
      profile: {
        email: 'not-returned-by-parser@example.test',
        nested: {
          passedExams: [
            {
              ExamTitle: 'Designing Microsoft Azure Infrastructure Solutions',
              ExamNumber: 'AZ-305',
              ExamDateTaken: '31 Oct 2025',
            },
          ],
        },
      },
    }),
  );

  assert.ok(result);
  assert.deepEqual(result.exams, [
    {
      title: 'Designing Microsoft Azure Infrastructure Solutions',
      examNumber: 'AZ-305',
      passedOn: '2025-10-31',
    },
  ]);
  assert.equal(JSON.stringify(result).includes('not-returned-by-parser'), false);
});

test('returns null for non-JSON content and a bounded warning for unsupported JSON', () => {
  assert.equal(parseMicrosoftLearnTranscriptApiPayload('<html></html>'), null);

  const unsupported = parseMicrosoftLearnTranscriptApiPayload(JSON.stringify({ modulesCompleted: [] }));
  assert.ok(unsupported);
  assert.equal(unsupported.credentials.length, 0);
  assert.equal(unsupported.exams.length, 0);
  assert.equal(unsupported.warnings.length, 1);
  assert.match(unsupported.warnings[0], /Transcript API response/);
});
