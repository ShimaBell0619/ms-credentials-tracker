import assert from 'node:assert/strict';
import test from 'node:test';
import { findReusableGoogleCalendarId } from '../src/integrations/google-calendar-discovery.ts';

const description =
  'Microsoft Credentials Tracker が資格更新予定と通知のために管理する専用カレンダーです。';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('reuses the same deterministic app-created calendar when local origin state is absent', async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);

    if (url.includes('/users/me/calendarList?')) {
      return jsonResponse({
        items: [
          {
            id: 'calendar-z',
            summary: 'Microsoft Credentials Tracker',
            description,
            accessRole: 'owner',
          },
          {
            id: 'unrelated',
            summary: 'Microsoft Credentials Tracker',
            description: 'Created manually',
            accessRole: 'owner',
          },
          {
            id: 'calendar-a',
            summary: 'Microsoft Credentials Tracker',
            description,
            accessRole: 'owner',
          },
        ],
      });
    }

    if (url.endsWith('/calendars/calendar-a')) return jsonResponse({ id: 'calendar-a' });
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await findReusableGoogleCalendarId('token');
    assert.equal(result, 'calendar-a');
    assert.equal(requested.some((url) => url.includes('unrelated')), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('skips matching calendars that are not accessible through calendar.app.created', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes('/users/me/calendarList?')) {
      return jsonResponse({
        items: [
          {
            id: 'calendar-a',
            summary: 'Microsoft Credentials Tracker',
            description,
            accessRole: 'owner',
          },
          {
            id: 'calendar-b',
            summary: 'Microsoft Credentials Tracker',
            description,
            accessRole: 'owner',
          },
        ],
      });
    }

    if (url.endsWith('/calendars/calendar-a')) return jsonResponse({ error: 'forbidden' }, 403);
    if (url.endsWith('/calendars/calendar-b')) return jsonResponse({ id: 'calendar-b' });
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    assert.equal(await findReusableGoogleCalendarId('token'), 'calendar-b');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns null when no dedicated calendar exists so normal creation can proceed', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/users/me/calendarList?')) {
      return jsonResponse({
        items: [
          {
            id: 'personal',
            summary: 'My Calendar',
            accessRole: 'owner',
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    assert.equal(await findReusableGoogleCalendarId('token'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
