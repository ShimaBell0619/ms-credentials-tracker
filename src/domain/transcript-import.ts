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
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/([A-Z0-9])[\uFFFD\uFFFE\uFFFF]([A-Z0-9])/gi, '$1-$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitleForCompare(value: string): string {
  return normalizeWhitespace(value).replace(/\s+/g, '').toLocaleLowerCase('en-US');
}

function normalizeExternalNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  return normalizeWhitespace(value).replace(/\s*-\s*/g, '-').replace(/\s+/g, '');
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
        [definition.canonicalTitle, ...(definition.aliases ?? [])].some((candidate) => {
          const normalizedCandidate = normalizeTitleForCompare(candidate);
          return (
            normalized.includes(normalizedCandidate) ||
            (normalized.length >= 16 && normalizedCandidate.startsWith(normalized))
          );
        }),
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

  match = normalized.match(/^([A-Za-z]+)\s*(\d{1,2}),?\s*(\d{4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return null;
    return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
  }

  match = normalized.match(/^(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})$/);
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

function findLastMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  let last: RegExpMatchArray | null = null;
  for (const match of text.matchAll(globalPattern)) last = match;
  return last;
}

function stripLeadingTableHeaders(section: string, patterns: RegExp[]): string {
  const probe = section.slice(0, 600);
  let end = 0;
  for (const pattern of patterns) {
    const match = pattern.exec(probe);
    if (match?.index !== undefined) end = Math.max(end, match.index + match[0].length);
  }
  return section.slice(end).trim();
}

function getActiveCertificationSection(compactText: string): string {
  const startMatch = findLastMatch(
    compactText,
    /\bActive certifications\b|アクティブな認定資格|有効な認定資格/i,
  );
  if (!startMatch || startMatch.index === undefined) return '';

  const remainder = compactText.slice(startMatch.index + startMatch[0].length);
  const endMatch = /\b(?:Passed exams|Applied Skills|Historical certifications|Learning paths completed|Microsoft Certified Trainer History)\b|合格した試験|合格済みの試験|応用スキル|認定資格の履歴|過去の認定資格|完了したラーニング パス/i.exec(
    remainder,
  );
  const section = endMatch ? remainder.slice(0, endMatch.index) : remainder;
  return stripLeadingTableHeaders(section, [
    /Certification title|認定資格(?:の)?タイトル/i,
    /Certification number|認定資格番号|資格証明番号|資格情報番号/i,
    /Earned on|取得日|取得日付/i,
    /Expires on|有効期限|有効期限日/i,
  ]);
}

function parseCertificationTable(compactText: string): TranscriptCredentialCandidate[] {
  const section = getActiveCertificationSection(compactText);
  if (!section) return [];

  const numberPattern = new RegExp(EXTERNAL_NUMBER_SOURCE, 'gi');
  const datePattern = new RegExp(`(?:${NO_DATE_SOURCE}|${DATE_SOURCE})`, 'gi');
  const numbers = Array.from(section.matchAll(numberPattern));
  const candidates: TranscriptCredentialCandidate[] = [];
  let cursor = 0;

  for (let index = 0; index < numbers.length; index += 1) {
    const number = numbers[index];
    if (number.index === undefined) continue;
    const rawTitle = normalizeWhitespace(section.slice(cursor, number.index));
    const microsoftIndex = Math.max(
      rawTitle.lastIndexOf('Microsoft'),
      rawTitle.lastIndexOf('マイクロソフト'),
    );
    const title = microsoftIndex >= 0 ? rawTitle.slice(microsoftIndex) : rawTitle;
    const metadataStart = number.index + number[0].length;
    const metadataEnd = numbers[index + 1]?.index ?? section.length;
    const metadata = section.slice(metadataStart, metadataEnd);
    const dates = Array.from(metadata.matchAll(datePattern)).slice(0, 2);
    if (!title || dates.length === 0) continue;

    candidates.push(
      buildCredentialCandidate(
        'certification',
        title,
        number[0],
        normalizeTranscriptDate(dates[0]?.[0]),
        normalizeTranscriptDate(dates[1]?.[0]),
      ),
    );
    const lastDate = dates[1] ?? dates[0];
    cursor = metadataStart + (lastDate?.index ?? 0) + (lastDate?.[0].length ?? 0);
  }

  return candidates;
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
  const startMatch = findLastMatch(compactText, /\bPassed exams\b|合格した試験|合格済みの試験/i);
  if (!startMatch || startMatch.index === undefined) return '';

  const remainder = compactText.slice(startMatch.index + startMatch[0].length);
  const endMatch = /\b(?:Applied Skills|Active certifications|Historical certifications|Learning paths completed|Microsoft Certified Trainer History)\b|応用スキル|有効な認定資格|アクティブな認定資格|認定資格の履歴|過去の認定資格|完了したラーニング パス/i.exec(
    remainder,
  );
  const section = endMatch ? remainder.slice(0, endMatch.index) : remainder;
  return stripLeadingTableHeaders(section, [
    /Exam title|試験(?:の)?タイトル/i,
    /Exam number|試験番号/i,
    /Passed date|合格日/i,
  ]);
}

function parseExams(compactText: string): TranscriptExamCandidate[] {
  const section = getPassedExamSection(compactText);
  if (!section) return [];

  const codePattern = /[A-Z]{1,5}-\d{2,4}/gi;
  const datePattern = new RegExp(DATE_SOURCE, 'i');
  const codes = Array.from(section.matchAll(codePattern));
  const exams: TranscriptExamCandidate[] = [];
  let cursor = 0;

  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (code.index === undefined) continue;
    const title = normalizeWhitespace(section.slice(cursor, code.index));
    const afterCode = section.slice(code.index + code[0].length, codes[index + 1]?.index ?? section.length);
    const date = datePattern.exec(afterCode);
    if (!title || !date) continue;

    exams.push({
      title,
      examNumber: code[0].toUpperCase(),
      passedOn: normalizeTranscriptDate(date[0]),
    });
    cursor = code.index + code[0].length + (date.index ?? 0) + date[0].length;
  }

  return exams;
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
