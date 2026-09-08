import type { GoogleCalendarSyncCounts } from '../integrations/google-calendar.ts';

export const GOOGLE_CALENDAR_STORAGE_KEY = 'ms-credentials-tracker:google-calendar:v1';

export interface GoogleCalendarIntegrationState {
  version: 1;
  calendarId: string | null;
  lastSyncedAt: string | null;
  lastResult: GoogleCalendarSyncCounts | null;
  lastDesiredFingerprint: string | null;
}

export function emptyGoogleCalendarIntegrationState(): GoogleCalendarIntegrationState {
  return {
    version: 1,
    calendarId: null,
    lastSyncedAt: null,
    lastResult: null,
    lastDesiredFingerprint: null,
  };
}

export function loadGoogleCalendarIntegrationState(
  storage: Storage = window.localStorage,
): GoogleCalendarIntegrationState {
  const raw = storage.getItem(GOOGLE_CALENDAR_STORAGE_KEY);
  if (!raw) return emptyGoogleCalendarIntegrationState();

  try {
    const value = JSON.parse(raw) as Partial<GoogleCalendarIntegrationState>;
    if (value.version !== 1) return emptyGoogleCalendarIntegrationState();
    return {
      version: 1,
      calendarId: typeof value.calendarId === 'string' ? value.calendarId : null,
      lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
      lastDesiredFingerprint:
        typeof value.lastDesiredFingerprint === 'string' ? value.lastDesiredFingerprint : null,
      lastResult:
        value.lastResult &&
        typeof value.lastResult.created === 'number' &&
        typeof value.lastResult.updated === 'number' &&
        typeof value.lastResult.deleted === 'number' &&
        typeof value.lastResult.unchanged === 'number'
          ? value.lastResult
          : null,
    };
  } catch {
    return emptyGoogleCalendarIntegrationState();
  }
}

export function saveGoogleCalendarIntegrationState(
  state: GoogleCalendarIntegrationState,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(GOOGLE_CALENDAR_STORAGE_KEY, JSON.stringify(state));
}
