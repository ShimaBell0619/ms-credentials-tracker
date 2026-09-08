import { credentialDefinitions, type CredentialDefinition } from './credential-catalog.ts';
import type { StoredCredential } from '../storage/local-credential-store.ts';

export type CredentialDerivedStatus =
  | 'active'
  | 'renewalAvailable'
  | 'expired'
  | 'nonExpiring';

export interface CredentialProjection {
  id: string;
  credentialDefinitionId: string;
  displayCode: string | null;
  name: string;
  firstEarnedOn: string;
  currentExpiresOn: string | null;
  renewalOpensOn: string | null;
  daysUntilExpiry: number | null;
  status: CredentialDerivedStatus;
}

export interface CredentialScheduleEvent {
  id: string;
  credentialId: string;
  credentialDefinitionId: string;
  date: string;
  displayCode: string | null;
  label: string;
  detail: string;
  kind: 'deadline' | 'renewal';
}

export interface CredentialDashboardProjection {
  referenceDate: string;
  credentials: CredentialProjection[];
  scheduleEvents: CredentialScheduleEvent[];
  nextDeadline: CredentialProjection | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const definitionById = new Map(
  credentialDefinitions.map((definition) => [definition.id, definition] as const),
);

function parseIsoDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Expected ISO date-only value, received: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatUtcDate(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function localDateToIso(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addDaysIso(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function differenceInCalendarDays(later: string, earlier: string): number {
  return Math.round((parseIsoDate(later).getTime() - parseIsoDate(earlier).getTime()) / DAY_MS);
}

function addMonthsClamped(value: string, months: number): string {
  const source = parseIsoDate(value);
  const targetMonthIndex = source.getUTCFullYear() * 12 + source.getUTCMonth() + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return formatUtcDate(
    new Date(Date.UTC(targetYear, targetMonth, Math.min(source.getUTCDate(), lastDay))),
  );
}

function getDefinition(record: StoredCredential): CredentialDefinition | null {
  return definitionById.get(record.credentialDefinitionId) ?? null;
}

export function projectCredential(
  record: StoredCredential,
  referenceDate: string,
): CredentialProjection | null {
  const definition = getDefinition(record);
  if (!definition) return null;

  if (definition.validityPolicy.type === 'nonExpiring') {
    return {
      id: record.id,
      credentialDefinitionId: definition.id,
      displayCode: definition.displayCode,
      name: definition.canonicalTitle,
      firstEarnedOn: record.firstEarnedOn,
      currentExpiresOn: null,
      renewalOpensOn: null,
      daysUntilExpiry: null,
      status: 'nonExpiring',
    };
  }

  const currentExpiresOn = record.currentExpiresOn;
  if (!currentExpiresOn) {
    return {
      id: record.id,
      credentialDefinitionId: definition.id,
      displayCode: definition.displayCode,
      name: definition.canonicalTitle,
      firstEarnedOn: record.firstEarnedOn,
      currentExpiresOn: null,
      renewalOpensOn: null,
      daysUntilExpiry: null,
      status: 'active',
    };
  }

  const renewalOpensOn = addMonthsClamped(
    currentExpiresOn,
    -definition.validityPolicy.renewalWindowMonths,
  );
  const daysUntilExpiry = differenceInCalendarDays(currentExpiresOn, referenceDate);
  const status: CredentialDerivedStatus =
    daysUntilExpiry < 0
      ? 'expired'
      : referenceDate >= renewalOpensOn
        ? 'renewalAvailable'
        : 'active';

  return {
    id: record.id,
    credentialDefinitionId: definition.id,
    displayCode: definition.displayCode,
    name: definition.canonicalTitle,
    firstEarnedOn: record.firstEarnedOn,
    currentExpiresOn,
    renewalOpensOn,
    daysUntilExpiry,
    status,
  };
}

function eventLabel(projection: CredentialProjection, suffix: string): string {
  return `${projection.displayCode ?? projection.name} ${suffix}`;
}

export function buildCredentialDashboard(
  records: StoredCredential[],
  referenceDate: string,
  horizonDays = 90,
): CredentialDashboardProjection {
  const credentials = records
    .map((record) => projectCredential(record, referenceDate))
    .filter((credential): credential is CredentialProjection => credential !== null)
    .sort((left, right) => {
      const leftExpiry = left.currentExpiresOn ?? '9999-12-31';
      const rightExpiry = right.currentExpiresOn ?? '9999-12-31';
      return leftExpiry.localeCompare(rightExpiry) || left.name.localeCompare(right.name);
    });

  const scheduleEvents: CredentialScheduleEvent[] = [];
  for (const credential of credentials) {
    if (!credential.currentExpiresOn || !credential.renewalOpensOn) continue;

    const renewalOffset = differenceInCalendarDays(credential.renewalOpensOn, referenceDate);
    if (renewalOffset >= 0 && renewalOffset < horizonDays) {
      scheduleEvents.push({
        id: `${credential.id}:renewal:${credential.renewalOpensOn}`,
        credentialId: credential.id,
        credentialDefinitionId: credential.credentialDefinitionId,
        date: credential.renewalOpensOn,
        displayCode: credential.displayCode,
        label: eventLabel(credential, '更新開始'),
        detail: '更新アセスメントの対象期間に入る',
        kind: 'renewal',
      });
    }

    const expiryOffset = differenceInCalendarDays(credential.currentExpiresOn, referenceDate);
    if (expiryOffset >= 0 && expiryOffset < horizonDays) {
      scheduleEvents.push({
        id: `${credential.id}:deadline:${credential.currentExpiresOn}`,
        credentialId: credential.id,
        credentialDefinitionId: credential.credentialDefinitionId,
        date: credential.currentExpiresOn,
        displayCode: credential.displayCode,
        label: eventLabel(credential, '有効期限'),
        detail: 'この日までに更新が必要',
        kind: 'deadline',
      });
    }
  }
  scheduleEvents.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));

  const nextDeadline =
    credentials
      .filter(
        (credential) =>
          credential.currentExpiresOn !== null && credential.currentExpiresOn >= referenceDate,
      )
      .sort((left, right) =>
        (left.currentExpiresOn ?? '').localeCompare(right.currentExpiresOn ?? ''),
      )[0] ?? null;

  return { referenceDate, credentials, scheduleEvents, nextDeadline };
}
