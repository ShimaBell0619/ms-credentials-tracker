import { matchCredentialDefinition } from './credential-catalog.ts';

export type ImportMatchStatus = 'matched' | 'unresolved';

export interface TranscriptCredentialCandidate {
  kind: 'certification' | 'appliedSkill';
  detectedTitle: string;
  externalNumber: string | null;
  earnedOn: string | null;
  expiresOn: string | null;
  matchedDefinitionId: string | null;
  matchStatus: ImportMatchStatus;
}

export interface TranscriptExamCandidate {
  title: string;
  examNumber: string;
  passedOn: string | null;
}

export interface TranscriptParseResult {
  credentials: TranscriptCredentialCandidate[];
  exams: TranscriptExamCandidate[];
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_SOURCE =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_SOURCE = `(?:${MONTH_SOURCE}\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\s+${MONTH_SOURCE}\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2})`;
const EXTERNAL_NUMBER_SOURCE = '(?:[A-Z0-9]{4,}(?:-[A-Z0-9]{4,})+|[A-Z0-9]{12,})';

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeTranscriptDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeWhitespace(value).replace(/,$/, '');
  if (/^N\/?A$/i.test(normalized)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  let match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return null;
    return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
  }

  match = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    if (!month) return null;
    return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
  }

  return null;
}

function buildCredentialCandidate(
  kind: TranscriptCredentialCandidate['kind'],
  detectedTitle: string,
  externalNumber: string | null,
  earnedOn: string | null,
  expiresOn: string | null,
): TranscriptCredentialCandidate {
  const title = normalizeWhitespace(detectedTitle);
  const definition = matchCredentialDefinition(title);
  return {
    kind,
    detectedTitle: title,
    externalNumber,
    earnedOn,
    expiresOn,
    matchedDefinitionId: definition?.id ?? null,
    matchStatus: definition ? 'matched' : 'unresolved',
  };
}

function parseCertifications(compactText: string): TranscriptCredentialCandidate[] {
  const pattern = new RegExp(
    `(Microsoft Certified:\\s+.+?)\\s+(${EXTERNAL_NUMBER_SOURCE})\\s+(?:Earned on\\s*:?\\s*)?(${DATE_SOURCE})\\s+(?:Expires on\\s*:?\\s*)?(N\\/?A|${DATE_SOURCE})`,
    'gi',
  );

  return Array.from(compactText.matchAll(pattern), (match) =>
    buildCredentialCandidate(
      'certification',
      match[1],
      match[2],
      normalizeTranscriptDate(match[3]),
      normalizeTranscriptDate(match[4]),
    ),
  );
}

function parseAppliedSkills(compactText: string): TranscriptCredentialCandidate[] {
  const pattern = new RegExp(
    `(Microsoft Applied Skills:\\s+.+?)\\s+(?:Credential number\\s*:?\\s*)?(${EXTERNAL_NUMBER_SOURCE})\\s+(?:Earned on\\s*:?\\s*)?(${DATE_SOURCE})`,
    'gi',
  );

  return Array.from(compactText.matchAll(pattern), (match) =>
    buildCredentialCandidate(
      'appliedSkill',
      match[1],
      match[2],
      normalizeTranscriptDate(match[3]),
      null,
    ),
  );
}

function getPassedExamSection(compactText: string): string {
  const startMatch = /\bPassed exams\b/i.exec(compactText);
  if (!startMatch) return '';

  const start = startMatch.index + startMatch[0].length;
  const remainder = compactText.slice(start);
  const endMatch = /\b(?:Applied Skills|Active certifications|Historical certifications|Learning paths completed|Microsoft Certified Trainer History)\b/i.exec(
    remainder,
  );
  return endMatch ? remainder.slice(0, endMatch.index) : remainder;
}

function parseExams(compactText: string): TranscriptExamCandidate[] {
  let section = getPassedExamSection(compactText);
  if (!section) return [];
  section = section.replace(/^\s*Exam title\s+Exam number\s+Passed date\s*/i, '');

  const pattern = new RegExp(`(.+?)\\s+([A-Z]{1,5}-\\d{2,4})\\s+(${DATE_SOURCE})`, 'gi');
  return Array.from(section.matchAll(pattern), (match) => ({
    title: normalizeWhitespace(match[1]),
    examNumber: match[2].toUpperCase(),
    passedOn: normalizeTranscriptDate(match[3]),
  }));
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

export function parseMicrosoftLearnTranscript(text: string): TranscriptParseResult {
  const compactText = normalizeWhitespace(text);
  if (!compactText) {
    return { credentials: [], exams: [], warnings: ['Transcript text is empty.'] };
  }

  const credentials = dedupeCredentials([
    ...parseCertifications(compactText),
    ...parseAppliedSkills(compactText),
  ]);
  const exams = parseExams(compactText);
  const warnings: string[] = [];

  if (credentials.length === 0 && exams.length === 0) {
    warnings.push('No supported credential or exam records were detected.');
  }
  if (credentials.some((candidate) => candidate.matchStatus === 'unresolved')) {
    warnings.push('Some detected credentials do not match the local credential catalog.');
  }
  if (credentials.some((candidate) => !candidate.earnedOn)) {
    warnings.push('Some detected credentials are missing a parseable earned date.');
  }

  return { credentials, exams, warnings };
}
