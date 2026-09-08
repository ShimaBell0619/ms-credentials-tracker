# Google Calendar integration

The v0.3 Calendar integration keeps browser-local credential data as the application source of truth and projects renewal dates into a dedicated Google Calendar.

## Authorization model

The browser uses Google Identity Services (GIS) OAuth token model.

- OAuth is requested only when the user explicitly starts Calendar synchronization.
- The requested scope is `https://www.googleapis.com/auth/calendar.app.created`.
- The access token is kept in memory only and is not written to localStorage.
- There is no Google login/session for the application itself and no refresh-token backend.

The scope is intentionally narrower than full Calendar access. It allows the application to create secondary calendars and manage events on calendars created by the application.

## Google Cloud and Vercel setup

1. Create or choose a Google Cloud project.
2. Enable **Google Calendar API**.
3. Configure the Google Auth Platform / OAuth consent screen.
4. Create an OAuth 2.0 Client ID with application type **Web application**.
5. Add the canonical Production origin to **Authorized JavaScript origins**: `https://credentials.shimabell.dev`.
6. If the OAuth app is in Testing, add the intended Google account as a test user.
7. Add the public Client ID to the Vercel project as `VITE_GOOGLE_CLIENT_ID` for Production.

The Client ID is public browser configuration, not a client secret. Never add a Google OAuth client secret to this SPA.

Local development can use `.env.local`:

```text
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Do not commit `.env.local`.

### Preview deployment constraint

Vercel creates a distinct Preview origin for non-production branches and Pull Requests. Google OAuth **Authorized JavaScript origins require exact origins and do not allow wildcard hostnames**. Therefore arbitrary Vercel Preview URLs cannot all be authorized once with `*.vercel.app`.

Use Vercel Preview Deployments for UI, responsive, import, projection, and other non-OAuth review by default. Google Calendar authorization works on Production through `https://credentials.shimabell.dev` after that origin is registered, and on a specific Preview only if that exact Preview origin is explicitly added to the OAuth client. Do not weaken the OAuth model or add a client secret to work around this platform constraint.

See [DEPLOYMENT.md](DEPLOYMENT.md) for environment ownership and the Vercel deployment flow.

## Calendar ownership and reconciliation

The application creates a secondary calendar named `Microsoft Credentials Tracker` and stores its Google Calendar ID in browser-local integration state.

Each managed event carries private extended properties:

- an app ownership marker;
- a stable app event key;
- credential ID;
- event kind (`renewal` or `expiry`).

Full sync uses these markers rather than title/date matching. It creates missing events, patches changed managed fields, deletes stale app-managed events, and leaves unrelated events untouched.

If the locally stored dedicated calendar ID no longer exists for the authorized account, the app creates a new dedicated calendar. Clearing browser-local storage can therefore orphan the old dedicated calendar; it will not be guessed or deleted by title.

## Event presentation and reminder policy

Managed events use explicit type prefixes so the meaning is visible even when Calendar colors are difficult to distinguish:

- renewal opening: `【更新】<credential code/name>` with Google event color ID `9` (blue);
- expiry: `【期限】<credential code/name>` with Google event color ID `11` (red).

The colors are secondary cues only; the title prefix is the primary semantic marker. Existing managed events are patched to the desired title/color on the next explicit full sync.

Renewal-opening events use popup reminders at:

- 28 days before (`40320` minutes);
- 7 days before (`10080` minutes);
- the event time (`0` minutes).

Google Calendar accepts at most 40,320 minutes for an event reminder override, so the earlier 30-day design was deliberately changed to 28 days.

Expiry events are created as separate all-day events with `useDefault: false` and no reminder overrides, preventing the dedicated calendar's default reminders from creating duplicate notifications.

## Failure model

A Calendar error never mutates credential facts. Remote synchronization can be partially applied before an API failure; the next explicit full sync is idempotent and converges again.

The app stores only integration metadata such as calendar ID, last successful sync time, and the last desired-state fingerprint. It does not claim background synchronization.
