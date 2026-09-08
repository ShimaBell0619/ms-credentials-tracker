import { credentialDefinitions, matchCredentialDefinition } from './credential-catalog.ts';

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
const JAPANESE_DATE_SOURCE = '\\d{4}\\s*年\\s*\\d{1,2}\\s*月\\s*\\d{1,2}\\s*日';
const DATE_SOURCE = `(?:${MONTH_SOURCE}\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\s+${MONTH_SOURCE}\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|${JAPANESE_DATE_SOURCE})`;
const NO_DATE_SOURCE = '(?:N\\/?A|該当なし|なし)';
const EXTERNAL_NUMBER_SOURCE =
  '(?:[A-Z0-9]{4,}(?:\\s*-\\s*[A-Z0-9]{4,})+|[A-Z0-9]{12,})';
const EARNED_LABEL_SOURCE = '(?:(?:Earned on|取得日|取得日付)\\s*[:：]?\\s*)?';
const EXPIRES_LABEL_SOURCE = '(?:(?:Expires on|有効期限|有効期限日)\\s*[:：]?\\s*)?';

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/([A-Z0-9])[\uFFFD\uFFFE\uFFFF]([A-Z0-9])/gi, '$1-$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitleForCompare(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('en-US');
}

function normalizeExternalNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  return normalizeWhitespace(value).replace(/\s*-\s*/g, '-');
}

function canonicalTitleInside(
  kind: TranscriptCredentialCandidate['kind'],
  detectedTitle: string,
): string | null {
  const normalized = normalizeTitleForCompare(detectedTitle);
  return (
    credentialDefinitions.find(
      (definition) =>
        definition.kind === kind &&
        [definition.canonicalTitle, ...(definition.aliases ?? [])].some((candidate) =>
          normalized.includes(normalizeTitleForCompare(candidate)),
        ),
    )?.canonicalTitle ?? null
  );
}

export function normalizeTranscriptDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeWhitespace(value).replace(/,$/, '');
  if (/^(?:N\/?A|該当なし|なし)$/i.test(normalized)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  let match = normalized.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (match) {
    return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  }

  match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
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
  const rawTitle = normalizeWhitespace(detectedTitle);
  const directDefinition = matchCredentialDefinition(rawTitle);
  const canonicalTitle = directDefinition?.canonicalTitle ?? canonicalTitleInside(kind, rawTitle);
  const definition = directDefinition ?? (canonicalTitle ? matchCredentialDefinition(canonicalTitle) : null);
  return {
    kind,
    detectedTitle: definition?.canonicalTitle ?? rawTitle,
    externalNumber: normalizeExternalNumber(externalNumber),
    earnedOn,
    expiresOn,
    matchedDefinitionId: definition?.id ?? null,
    matchStatus: definition ? 'matched' : 'unresolved',
  };
}

function getActiveCertificationSection(compactText: string): string {
  const startPattern = new RegExp(
    `(?:\\bActive certifications\\b|アクティブな認定資格|有効な認定資格)\\s+` +
      `(?:Certification title|認定資格(?:の)?タイトル)\\s+` +
      `(?:Certification number|認定資格番号|資格証明番号|資格情報番号)\\s+` +
      `(?:Earned on|取得日|取得日付)\\s+` +
      `(?:Expires on|有効期限|有効期限日)`,
    'i',
  );
  const startMatch = startPattern.exec(compactText);
  if (!startMatch) return '';

  const remainder = compactText.slice(startMatch.index + startMatch[0].length);
  const endMatch = /\b(?:Passed exams|Applied Skills|Historical certifications|Learning paths completed|Microsoft Certified Trainer History)\b|合格した試験|合格済みの試験|応用スキル|認定資格の履歴|過去の認定資格|完了したラーニング パス/i.exec(
    remainder,
  );
  return endMatch ? remainder.slice(0, endMatch.index) : remainder;
}

function parseCertificationTable(compactText: string): TranscriptCredentialCandidate[] {
  const section = getActiveCertificationSection(compactText);
  if (!section) return [];

  const pattern = new RegExp(
    `(.+?)\\s+(${EXTERNAL_NUMBER_SOURCE})\\s+(${DATE_SOURCE})\\s+(${NO_DATE_SOURCE}|${DATE_SOURCE})`,
    'gi',
  );

  return Array.from(section.matchAll(pattern), (match) =>
    buildCredentialCandidate(
      'certification',
      match[1],
      match[2],
      normalizeTranscriptDate(match[3]),
      normalizeTranscriptDate(match[4]),
    ),
  );
}

function parseCertificationFallback(compactText: string): TranscriptCredentialCandidate[] {
  const pattern = new RegExp(
    `(Microsoft Certified:\\s+.+?)\\s+(${EXTERNAL_NUMBER_SOURCE})\\s+${EARNED_LABEL_SOURCE}(${DATE_SOURCE})\\s+${EXPIRES_LABEL_SOURCE}(${NO_DATE_SOURCE}|${DATE_SOURCE})`,
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

function parseCertifications(compactText: string): TranscriptCredentialCandidate[] {
  const tableCandidates = parseCertificationTable(compactText);
  return tableCandidates.length > 0 ? tableCandidates : parseCertificationFallback(compactText);
}

function parseAppliedSkills(compactText: string): TranscriptCredentialCandidate[] {
  const credentialNumberLabel =
    '(?:(?:Credential number|資格証明番号|資格情報番号|認定資格番号)\\s*[:：]?\\s*)?';
  const pattern = new RegExp(
    `(Microsoft Applied Skills:\\s+.+?)\\s+${credentialNumberLabel}(${EXTERNAL_NUMBER_SOURCE})\\s+${EARNED_LABEL_SOURCE}(${DATE_SOURCE})`,
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
  const startPattern = new RegExp(
    `(?:\\bPassed exams\\b|合格した試験|合格済みの試験)\\s+` +
      `(?:Exam title|試験(?:の)?タイトル)\\s+` +
      `(?:Exam number|試験番号)\\s+` +
      `(?:Passed date|合格日)`,
    'i',
  );
  const startMatch = startPattern.exec(compactText);
  if (!startMatch) return '';

  const remainder = compactText.slice(startMatch.index + startMatch[0].length);
  const endMatch = /\b(?:Applied Skills|Active certifications|Historical certifications|Learning paths completed|Microsoft Certified Trainer History)\b|応用スキル|有効な認定資格|アクティブな認定資格|認定資格の履歴|過去の認定資格|完了したラーニング パス/i.exec(
    remainder,
  );
  return endMatch ? remainder.slice(0, endMatch.index) : remainder;
}

function parseExams(compactText: string): TranscriptExamCandidate[] {
  const section = getPassedExamSection(compactText);
  if (!section) return [];

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
