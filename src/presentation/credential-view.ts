import type { CredentialProjection } from '../domain/credential-projection';

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatFullDate(value: string | null): string {
  return value ? value.replaceAll('-', '.') : '—';
}

export function formatMonthDay(value: string): string {
  return value.slice(5).replace('-', '.');
}

export function formatDeadlineMeta(value: string): string {
  const date = parseIsoDate(value);
  const weekday = new Intl.DateTimeFormat('ja-JP', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
  return `${date.getUTCFullYear()} / ${weekday}`;
}

export function formatReferenceDate(value: string): string {
  return value.replaceAll('-', '.');
}

export function renewalNote(credential: CredentialProjection): string {
  switch (credential.status) {
    case 'nonExpiring':
      return '更新不要';
    case 'expired':
      return '有効期限を過ぎています';
    case 'renewalAvailable':
      return '更新アセスメントを受験できます';
    case 'active':
      return credential.renewalOpensOn
        ? `${formatFullDate(credential.renewalOpensOn)} から更新可能`
        : '有効期限を確認してください';
  }
}
