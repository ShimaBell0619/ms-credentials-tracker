import { addDaysIso, projectCredential } from '../domain/credential-projection.ts';
import type { StoredCredential } from '../storage/local-credential-store.ts';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
export const GOOGLE_CALENDAR_SUMMARY = 'Microsoft Credentials Tracker';
export const RENEWAL_REMINDER_MINUTES = [40320, 10080, 0] as const;

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MANAGED_MARKER_KEY = 'mctManaged';
const MANAGED_MARKER_VALUE = '1';
const EVENT_KEY_PROPERTY = 'mctEventKey';
const CREDENTIAL_ID_PROPERTY = 'mctCredentialId';
const EVENT_KIND_PROPERTY = 'mctKind';

export type GoogleCalendarEventKind = 'renewal' | 'expiry';

export interface GoogleCalendarReminderOverride {
  method: 'popup';
  minutes: number;
}

export interface GoogleCalendarDesiredEvent {
  key: string;
  credentialId: string;
  kind: GoogleCalendarEventKind;
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  transparency: 'transparent';
  reminders: {
    useDefault: false;
    overrides: GoogleCalendarReminderOverride[];
  };
  extendedProperties: {
    private: Record<string, string>;
  };
}

export interface GoogleCalendarRemoteEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string };
  end?: { date?: string };
  transparency?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method?: string; minutes?: number }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface GoogleCalendarApi {
  getCalendar(calendarId: string): Promise<{ id: string; summary?: string }>;
  createCalendar(input: { summary: string; description: string }): Promise<{ id: string }>;
  listManagedEvents(calendarId: string): Promise<GoogleCalendarRemoteEvent[]>;
  createEvent(calendarId: string, event: GoogleCalendarDesiredEvent): Promise<{ id: string }>;
  patchEvent(calendarId: string, eventId: string, event: GoogleCalendarDesiredEvent): Promise<void>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}

export interface GoogleCalendarSyncCounts {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export interface GoogleCalendarSyncResult extends GoogleCalendarSyncCounts {
  calendarId: string;
  calendarCreated: boolean;
}

export class GoogleCalendarApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GoogleCalendarApiError';
    this.status = status;
  }
}

export class GoogleCalendarSyncError extends Error {
  readonly stage: 'calendar' | 'events';
  readonly calendarId: string | null;
  readonly partial: GoogleCalendarSyncCounts;
  readonly cause: unknown;

  constructor(
    stage: 'calendar' | 'events',
    calendarId: string | null,
    partial: GoogleCalendarSyncCounts,
    cause: unknown,
  ) {
    super(stage === 'calendar' ? 'Google Calendar setup failed.' : 'Google Calendar sync failed.');
    this.name = 'GoogleCalendarSyncError';
    this.stage = stage;
    this.calendarId = calendarId;
    this.partial = partial;
    this.cause = cause;
  }
}

function eventDescription(kind: GoogleCalendarEventKind): string {
  const meaning = kind === 'renewal' ? '資格の更新可能日' : '資格の有効期限';
  return [
    `Microsoft Credentials Tracker から同期された${meaning}です。`,
    '資格情報の正本はアプリ内のブラウザ保存データです。',
  ].join('\n');
}

function managedProperties(
  key: string,
  credentialId: string,
  kind: GoogleCalendarEventKind,
): Record<string, string> {
  return {
    [MANAGED_MARKER_KEY]: MANAGED_MARKER_VALUE,
    [EVENT_KEY_PROPERTY]: key,
    [CREDENTIAL_ID_PROPERTY]: credentialId,
    [EVENT_KIND_PROPERTY]: kind,
  };
}

function desiredEvent(
  credentialId: string,
  kind: GoogleCalendarEventKind,
  displayName: string,
  date: string,
): GoogleCalendarDesiredEvent {
  const key = `${credentialId}:${kind}`;
  const renewal = kind === 'renewal';
  return {
    key,
    credentialId,
    kind,
    summary: `${displayName} ${renewal ? '更新可能' : '有効期限'}`,
    description: eventDescription(kind),
    start: { date },
    end: { date: addDaysIso(date, 1) },
    transparency: 'transparent',
    reminders: {
      useDefault: false,
      overrides: renewal
        ? RENEWAL_REMINDER_MINUTES.map((minutes) => ({ method: 'popup' as const, minutes }))
        : [],
    },
    extendedProperties: {
      private: managedProperties(key, credentialId, kind),
    },
  };
}

export function fingerprintGoogleCalendarDesiredEvents(
  events: GoogleCalendarDesiredEvent[],
): string {
  return events
    .map((event) =>
      JSON.stringify([
        event.key,
        event.summary,
        event.start.date,
        event.end.date,
        event.reminders.overrides.map((reminder) => reminder.minutes),
      ]),
    )
    .join('|');
}

export function buildGoogleCalendarDesiredEvents(
  records: StoredCredential[],
  referenceDate: string,
): GoogleCalendarDesiredEvent[] {
  const desired: GoogleCalendarDesiredEvent[] = [];

  for (const record of records) {
    if (record.archivedAt) continue;
    const projection = projectCredential(record, referenceDate);
    if (
      !projection ||
      projection.status === 'expired' ||
      projection.status === 'nonExpiring' ||
      !projection.currentExpiresOn ||
      !projection.renewalOpensOn
    ) {
      continue;
    }

    const displayName = projection.displayCode ?? projection.name;
    desired.push(
      desiredEvent(record.id, 'renewal', displayName, projection.renewalOpensOn),
      desiredEvent(record.id, 'expiry', displayName, projection.currentExpiresOn),
    );
  }

  return desired.sort(
    (left, right) =>
      left.start.date.localeCompare(right.start.date) || left.key.localeCompare(right.key),
  );
}

function normalizeOverrides(
  overrides: Array<{ method?: string; minutes?: number }> | undefined,
): string[] {
  return (overrides ?? [])
    .filter(
      (override): override is { method: string; minutes: number } =>
        typeof override.method === 'string' && typeof override.minutes === 'number',
    )
    .map((override) => `${override.method}:${override.minutes}`)
    .sort();
}

function remoteMatchesDesired(
  remote: GoogleCalendarRemoteEvent,
  desired: GoogleCalendarDesiredEvent,
): boolean {
  const privateProperties = remote.extendedProperties?.private ?? {};
  const desiredOverrides = normalizeOverrides(desired.reminders.overrides);
  const remoteOverrides = normalizeOverrides(remote.reminders?.overrides);

  return (
    remote.summary === desired.summary &&
    remote.description === desired.description &&
    remote.start?.date === desired.start.date &&
    remote.end?.date === desired.end.date &&
    remote.transparency === desired.transparency &&
    remote.reminders?.useDefault === false &&
    JSON.stringify(remoteOverrides) === JSON.stringify(desiredOverrides) &&
    privateProperties[MANAGED_MARKER_KEY] === MANAGED_MARKER_VALUE &&
    privateProperties[EVENT_KEY_PROPERTY] === desired.key &&
    privateProperties[CREDENTIAL_ID_PROPERTY] === desired.credentialId &&
    privateProperties[EVENT_KIND_PROPERTY] === desired.kind
  );
}

function isAppManaged(event: GoogleCalendarRemoteEvent): boolean {
  return event.extendedProperties?.private?.[MANAGED_MARKER_KEY] === MANAGED_MARKER_VALUE;
}

function remoteEventKey(event: GoogleCalendarRemoteEvent): string | null {
  return event.extendedProperties?.private?.[EVENT_KEY_PROPERTY] ?? null;
}

function isMissingCalendarError(error: unknown): boolean {
  return error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410);
}

async function ensureCalendar(
  api: GoogleCalendarApi,
  storedCalendarId: string | null,
): Promise<{ calendarId: string; calendarCreated: boolean }> {
  if (storedCalendarId) {
    try {
      const calendar = await api.getCalendar(storedCalendarId);
      return { calendarId: calendar.id, calendarCreated: false };
    } catch (error) {
      if (!isMissingCalendarError(error)) throw error;
    }
  }

  const created = await api.createCalendar({
    summary: GOOGLE_CALENDAR_SUMMARY,
    description:
      'Microsoft Credentials Tracker が資格更新予定と通知のために管理する専用カレンダーです。',
  });
  return { calendarId: created.id, calendarCreated: true };
}

export async function syncGoogleCalendar(
  api: GoogleCalendarApi,
  desiredEvents: GoogleCalendarDesiredEvent[],
  storedCalendarId: string | null,
): Promise<GoogleCalendarSyncResult> {
  const counts: GoogleCalendarSyncCounts = {
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
  };

  let calendarId: string | null = null;
  let calendarCreated = false;
  try {
    const resolved = await ensureCalendar(api, storedCalendarId);
    calendarId = resolved.calendarId;
    calendarCreated = resolved.calendarCreated;
  } catch (error) {
    throw new GoogleCalendarSyncError('calendar', null, counts, error);
  }

  try {
    const remoteEvents = await api.listManagedEvents(calendarId);
    const byKey = new Map<string, GoogleCalendarRemoteEvent[]>();
    const invalidManagedEvents: GoogleCalendarRemoteEvent[] = [];

    for (const event of remoteEvents) {
      if (!isAppManaged(event)) continue;
      const key = remoteEventKey(event);
      if (!key) {
        invalidManagedEvents.push(event);
        continue;
      }
      const bucket = byKey.get(key) ?? [];
      bucket.push(event);
      byKey.set(key, bucket);
    }

    for (const desired of desiredEvents) {
      const candidates = byKey.get(desired.key) ?? [];
      const primary = candidates.shift();
      byKey.set(desired.key, candidates);

      if (!primary) {
        await api.createEvent(calendarId, desired);
        counts.created += 1;
      } else if (remoteMatchesDesired(primary, desired)) {
        counts.unchanged += 1;
      } else {
        await api.patchEvent(calendarId, primary.id, desired);
        counts.updated += 1;
      }
    }

    const staleEvents = [
      ...invalidManagedEvents,
      ...Array.from(byKey.values()).flat(),
    ];

    for (const stale of staleEvents) {
      await api.deleteEvent(calendarId, stale.id);
      counts.deleted += 1;
    }

    return { ...counts, calendarId, calendarCreated };
  } catch (error) {
    throw new GoogleCalendarSyncError('events', calendarId, counts, error);
  }
}

function eventResource(event: GoogleCalendarDesiredEvent) {
  return {
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    transparency: event.transparency,
    reminders: event.reminders,
    extendedProperties: event.extendedProperties,
  };
}

interface GoogleApiErrorPayload {
  error?: {
    message?: string;
  };
}

async function googleRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as GoogleApiErrorPayload;
      message = payload.error?.message ?? message;
    } catch {
      // Keep the HTTP status text when Google did not return JSON.
    }
    throw new GoogleCalendarApiError(response.status, message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export class GoogleCalendarRestApi implements GoogleCalendarApi {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  getCalendar(calendarId: string) {
    return googleRequest<{ id: string; summary?: string }>(
      this.accessToken,
      `/calendars/${encodeURIComponent(calendarId)}`,
    );
  }

  createCalendar(input: { summary: string; description: string }) {
    return googleRequest<{ id: string }>(this.accessToken, '/calendars', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listManagedEvents(calendarId: string): Promise<GoogleCalendarRemoteEvent[]> {
    const events: GoogleCalendarRemoteEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        maxResults: '250',
        privateExtendedProperty: `${MANAGED_MARKER_KEY}=${MANAGED_MARKER_VALUE}`,
        showDeleted: 'false',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const page = await googleRequest<{
        items?: GoogleCalendarRemoteEvent[];
        nextPageToken?: string;
      }>(
        this.accessToken,
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      );
      events.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return events;
  }

  createEvent(calendarId: string, event: GoogleCalendarDesiredEvent) {
    return googleRequest<{ id: string }>(
      this.accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(eventResource(event)),
      },
    );
  }

  async patchEvent(
    calendarId: string,
    eventId: string,
    event: GoogleCalendarDesiredEvent,
  ): Promise<void> {
    await googleRequest(
      this.accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(eventResource(event)),
      },
    );
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await googleRequest(
      this.accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
  }
}
