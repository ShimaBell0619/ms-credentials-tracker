import { matchCredentialDefinition } from './credential-catalog.ts';
import {
  normalizeTranscriptDate,
  type TranscriptCredentialCandidate,
  type TranscriptExamCandidate,
  type TranscriptParseResult,
} from './transcript-import.ts';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function findValue(record: JsonRecord, names: readonly string[]): unknown {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(key.toLowerCase())) return value;
  }
  return undefined;
}

function stringValue(record: JsonRecord, names: readonly string[]): string | null {
  const value = findValue(record, names);
  if (typeof value === 'string') {
    const normalized = normalizeWhitespace(value);
    return normalized || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeApiDate(value: string | null): string | null {
  if (!value) return null;
  const isoDate = value.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  return isoDate ?? normalizeTranscriptDate(value);
}

function collectArraysByKey(root: unknown, keys: readonly string[]): unknown[] {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const arrays: unknown[] = [];
  const visited = new Set<object>();

  function visit(value: unknown) {
    if (typeof value !== 'object' || value === null) return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    for (const [key, child] of Object.entries(value as JsonRecord)) {
      if (Array.isArray(child) && wanted.has(key.toLowerCase())) {
        arrays.push(...child);
      }
      visit(child);
    }
  }

  visit(root);
  return arrays;
}

function withPrefix(value: string, prefix: string): string {
  const normalized = normalizeWhitespace(value);
  return normalized.toLowerCase().startsWith(prefix.toLowerCase())
    ? normalized
    : `${prefix}${normalized}`;
}

function buildCredentialCandidate(
  kind: TranscriptCredentialCandidate['kind'],
  title: string,
  externalNumber: string | null,
  earnedOn: string | null,
  expiresOn: string | null,
): TranscriptCredentialCandidate {
  const detectedTitle = withPrefix(
    title,
    kind === 'certification' ? 'Microsoft Certified: ' : 'Microsoft Applied Skills: ',
  );
  const definition = matchCredentialDefinition(detectedTitle);
  return {
    kind,
    detectedTitle,
    externalNumber,
    earnedOn,
    expiresOn,
    matchedDefinitionId: definition?.id ?? null,
    matchStatus: definition ? 'matched' : 'unresolved',
  };
}

function parseCertifications(root: unknown): TranscriptCredentialCandidate[] {
  return collectArraysByKey(root, ['activeCertifications'])
    .map(asRecord)
    .filter((record): record is JsonRecord => record !== null)
    .flatMap((record) => {
      const title = stringValue(record, ['name', 'title']);
      if (!title) return [];
      return [
        buildCredentialCandidate(
          'certification',
          title,
          stringValue(record, ['certificationNumber', 'credentialNumber', 'credentialId', 'id']),
          normalizeApiDate(stringValue(record, ['dateEarned', 'earnedOn', 'awardedOn'])),
          normalizeApiDate(stringValue(record, ['expiration', 'expiresOn', 'expirationDate'])),
        ),
      ];
    });
}

function parseAppliedSkills(root: unknown): TranscriptCredentialCandidate[] {
  return collectArraysByKey(root, ['appliedSkillsCredentials'])
    .map(asRecord)
    .filter((record): record is JsonRecord => record !== null)
    .flatMap((record) => {
      const title = stringValue(record, ['title', 'name']);
      if (!title) return [];
      return [
        buildCredentialCandidate(
          'appliedSkill',
          title,
          stringValue(record, ['credentialId', 'credentialNumber', 'certificationNumber', 'id']),
          normalizeApiDate(stringValue(record, ['awardedOn', 'dateEarned', 'earnedOn'])),
          null,
        ),
      ];
    });
}

function parseExams(root: unknown): TranscriptExamCandidate[] {
  return collectArraysByKey(root, ['passedExams'])
    .map(asRecord)
    .filter((record): record is JsonRecord => record !== null)
    .flatMap((record) => {
      const title = stringValue(record, ['examTitle', 'title', 'name']);
      const examNumber = stringValue(record, ['examNumber', 'number', 'code']);
      if (!title || !examNumber) return [];
      return [
        {
          title,
          examNumber: examNumber.toUpperCase(),
          passedOn: normalizeApiDate(stringValue(record, ['examDateTaken', 'passedOn', 'datePassed'])),
        },
      ];
    });
}

function dedupeCredentials(candidates: TranscriptCredentialCandidate[]): TranscriptCredentialCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}:${candidate.externalNumber ?? ''}:${candidate.detectedTitle}:${candidate.earnedOn ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeExams(exams: TranscriptExamCandidate[]): TranscriptExamCandidate[] {
  const seen = new Set<string>();
  return exams.filter((exam) => {
    const key = `${exam.examNumber}:${exam.passedOn ?? ''}:${exam.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseMicrosoftLearnTranscriptApiPayload(content: string): TranscriptParseResult | null {
  let root: unknown;
  try {
    root = JSON.parse(content);
  } catch {
    return null;
  }

  if (typeof root !== 'object' || root === null) {
    return {
      credentials: [],
      exams: [],
      warnings: ['Transcript API response did not contain a supported object payload.'],
    };
  }

  const credentials = dedupeCredentials([
    ...parseCertifications(root),
    ...parseAppliedSkills(root),
  ]);
  const exams = dedupeExams(parseExams(root));
  const warnings: string[] = [];

  if (credentials.length === 0 && exams.length === 0) {
    warnings.push('No supported credential or exam records were detected in the Transcript API response.');
  }
  if (credentials.some((candidate) => candidate.matchStatus === 'unresolved')) {
    warnings.push('Some detected credentials do not match the local credential catalog.');
  }
  if (credentials.some((candidate) => !candidate.earnedOn)) {
    warnings.push('Some detected credentials are missing a parseable earned date.');
  }

  return { credentials, exams, warnings };
}
