import { GOOGLE_CALENDAR_SUMMARY } from './google-calendar.ts';

export const GOOGLE_CALENDAR_LIST_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_CALENDAR_DESCRIPTION =
  'Microsoft Credentials Tracker が資格更新予定と通知のために管理する専用カレンダーです。';

interface CalendarListEntry {
  id?: string;
  summary?: string;
  description?: string;
  deleted?: boolean;
}

interface CalendarListPage {
  items?: CalendarListEntry[];
  nextPageToken?: string;
}

class CalendarDiscoveryHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CalendarDiscoveryHttpError';
    this.status = status;
  }
}

async function googleRequest<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new CalendarDiscoveryHttpError(response.status, response.statusText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function listCandidateCalendarIds(accessToken: string): Promise<string[]> {
  const candidates = new Set<string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      maxResults: '250',
      minAccessRole: 'owner',
      showDeleted: 'false',
      showHidden: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const page = await googleRequest<CalendarListPage>(
      accessToken,
      `/users/me/calendarList?${params.toString()}`,
    );

    for (const entry of page.items ?? []) {
      if (
        entry.id &&
        !entry.deleted &&
        entry.summary === GOOGLE_CALENDAR_SUMMARY &&
        entry.description === GOOGLE_CALENDAR_DESCRIPTION
      ) {
        candidates.add(entry.id);
      }
    }

    pageToken = page.nextPageToken;
  } while (pageToken);

  return Array.from(candidates).sort();
}

async function isAccessibleAsAppCreatedCalendar(
  accessToken: string,
  calendarId: string,
): Promise<boolean> {
  try {
    await googleRequest<{ id: string }>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}`,
    );
    return true;
  } catch (error) {
    if (
      error instanceof CalendarDiscoveryHttpError &&
      (error.status === 403 || error.status === 404 || error.status === 410)
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Finds one canonical dedicated calendar across browser origins.
 *
 * Calendar IDs are stored in origin-scoped localStorage, so Production and Fixed Staging
 * cannot share that state directly. We discover calendars by the app's stable metadata and
 * then probe each candidate with calendar.app.created. Sorting by ID gives every origin the
 * same deterministic winner when historical duplicates exist.
 */
export async function findReusableGoogleCalendarId(accessToken: string): Promise<string | null> {
  const candidates = await listCandidateCalendarIds(accessToken);

  for (const calendarId of candidates) {
    if (await isAccessibleAsAppCreatedCalendar(accessToken, calendarId)) return calendarId;
  }

  return null;
}
