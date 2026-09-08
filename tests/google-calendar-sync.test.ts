import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGoogleCalendarDesiredEvents,
  GoogleCalendarApiError,
  GOOGLE_CALENDAR_EXPIRY_COLOR_ID,
  GOOGLE_CALENDAR_RENEWAL_COLOR_ID,
  type GoogleCalendarApi,
  type GoogleCalendarDesiredEvent,
  type GoogleCalendarRemoteEvent,
  RENEWAL_REMINDER_MINUTES,
  syncGoogleCalendar,
} from '../src/integrations/google-calendar.ts';
import type { StoredCredential } from '../src/storage/local-credential-store.ts';

function credential(
  id: string,
  credentialDefinitionId: string,
  currentExpiresOn: string | null,
  archivedAt: string | null = null,
): StoredCredential {
  return {
    id,
    credentialDefinitionId,
    source: 'learnTranscriptPdf',
    sourceRecordId: null,
    sourceTitle: credentialDefinitionId,
    firstEarnedOn: '2025-01-01',
    currentExpiresOn,
    confirmedAt: '2026-09-08T00:00:00.000Z',
    lastTranscriptConfirmedOn: '2026-09-08',
    manualOverrideAt: null,
    archivedAt,
  };
}

function remoteFromDesired(
  id: string,
  desired: GoogleCalendarDesiredEvent,
): GoogleCalendarRemoteEvent {
  return {
    id,
    summary: desired.summary,
    description: desired.description,
    colorId: desired.colorId,
    start: desired.start,
    end: desired.end,
    transparency: desired.transparency,
    reminders: desired.reminders,
    extendedProperties: desired.extendedProperties,
  };
}

class FakeCalendarApi implements GoogleCalendarApi {
  calendarId: string | null = null;
  events = new Map<string, GoogleCalendarRemoteEvent>();
  nextId = 1;
  operations: string[] = [];

  async getCalendar(calendarId: string) {
    this.operations.push(`calendar:get:${calendarId}`);
    if (this.calendarId !== calendarId) throw new GoogleCalendarApiError(404, 'not found');
    return { id: calendarId };
  }

  async createCalendar() {
    this.operations.push('calendar:create');
    this.calendarId = 'calendar-1';
    return { id: this.calendarId };
  }

  async listManagedEvents() {
    this.operations.push('events:list');
    return Array.from(this.events.values());
  }

  async createEvent(_calendarId: string, event: GoogleCalendarDesiredEvent) {
    const id = `event-${this.nextId++}`;
    this.operations.push(`event:create:${event.key}`);
    this.events.set(id, remoteFromDesired(id, event));
    return { id };
  }

  async patchEvent(_calendarId: string, eventId: string, event: GoogleCalendarDesiredEvent) {
    this.operations.push(`event:patch:${event.key}`);
    this.events.set(eventId, remoteFromDesired(eventId, event));
  }

  async deleteEvent(_calendarId: string, eventId: string) {
    this.operations.push(`event:delete:${eventId}`);
    this.events.delete(eventId);
  }
}

test('projects two all-day events per current expiring credential with labels, colors, and reminders only on renewal', () => {
  const events = buildGoogleCalendarDesiredEvents(
    [
      credential('az104', 'cert.azure-administrator-associate', '2027-03-15'),
      credential('az900', 'cert.azure-fundamentals', null),
      credential(
        'archived',
        'cert.azure-security-engineer-associate',
        '2027-04-01',
        '2026-09-01T00:00:00Z',
      ),
      credential('expired', 'cert.azure-security-engineer-associate', '2026-08-01'),
    ],
    '2026-09-08',
  );

  assert.equal(events.length, 2);
  const renewal = events.find((event) => event.kind === 'renewal');
  const expiry = events.find((event) => event.kind === 'expiry');
  assert.ok(renewal);
  assert.ok(expiry);
  assert.equal(renewal.summary, '【更新】AZ-104');
  assert.equal(expiry.summary, '【期限】AZ-104');
  assert.equal(renewal.colorId, GOOGLE_CALENDAR_RENEWAL_COLOR_ID);
  assert.equal(expiry.colorId, GOOGLE_CALENDAR_EXPIRY_COLOR_ID);
  assert.notEqual(renewal.colorId, expiry.colorId);
  assert.equal(renewal.start.date, '2026-09-15');
  assert.equal(renewal.end.date, '2026-09-16');
  assert.deepEqual(
    renewal.reminders.overrides.map((reminder) => reminder.minutes),
    [...RENEWAL_REMINDER_MINUTES],
  );
  assert.equal(renewal.reminders.useDefault, false);
  assert.deepEqual(expiry.reminders.overrides, []);
  assert.equal(expiry.reminders.useDefault, false);
});

test('full sync creates, updates, deletes, preserves unrelated events, and then becomes idempotent', async () => {
  const api = new FakeCalendarApi();
  api.calendarId = 'calendar-1';
  const desired = buildGoogleCalendarDesiredEvents(
    [credential('az104', 'cert.azure-administrator-associate', '2027-03-15')],
    '2026-09-08',
  );

  const renewal = desired.find((event) => event.kind === 'renewal');
  assert.ok(renewal);
  const staleRenewal = remoteFromDesired('existing-renewal', renewal);
  staleRenewal.summary = 'user-edited stale title';
  api.events.set(staleRenewal.id, staleRenewal);
  api.events.set('user-event', {
    id: 'user-event',
    summary: 'User-owned unrelated event',
  });
  api.events.set('stale-event', {
    id: 'stale-event',
    extendedProperties: {
      private: {
        mctManaged: '1',
        mctEventKey: 'obsolete:expiry',
        mctCredentialId: 'obsolete',
        mctKind: 'expiry',
      },
    },
  });

  const first = await syncGoogleCalendar(api, desired, 'calendar-1');
  assert.deepEqual(
    {
      created: first.created,
      updated: first.updated,
      deleted: first.deleted,
      unchanged: first.unchanged,
    },
    { created: 1, updated: 1, deleted: 1, unchanged: 0 },
  );
  assert.equal(api.events.size, 3);
  assert.ok(api.events.has('user-event'));

  api.operations.length = 0;
  const second = await syncGoogleCalendar(api, desired, 'calendar-1');
  assert.deepEqual(
    {
      created: second.created,
      updated: second.updated,
      deleted: second.deleted,
      unchanged: second.unchanged,
    },
    { created: 0, updated: 0, deleted: 0, unchanged: 2 },
  );
  assert.equal(api.operations.some((operation) => operation.startsWith('event:create')), false);
  assert.equal(api.operations.some((operation) => operation.startsWith('event:patch')), false);
  assert.equal(api.operations.some((operation) => operation.startsWith('event:delete')), false);
  assert.ok(api.events.has('user-event'));
});

test('missing stored calendar is replaced with a new dedicated calendar', async () => {
  const api = new FakeCalendarApi();
  const desired = buildGoogleCalendarDesiredEvents(
    [credential('az104', 'cert.azure-administrator-associate', '2027-03-15')],
    '2026-09-08',
  );

  const result = await syncGoogleCalendar(api, desired, 'missing-calendar');
  assert.equal(result.calendarId, 'calendar-1');
  assert.equal(result.calendarCreated, true);
  assert.equal(result.created, 2);
});
