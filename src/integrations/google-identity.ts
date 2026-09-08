import { GOOGLE_CALENDAR_SCOPE } from './google-calendar.ts';

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken(): void;
}

interface GoogleOAuth2Namespace {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }): GoogleTokenClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2Namespace;
      };
    };
  }
}

export class GoogleAuthorizationError extends Error {
  readonly kind: 'cancelled' | 'oauth' | 'unavailable';

  constructor(kind: 'cancelled' | 'oauth' | 'unavailable') {
    super(kind === 'cancelled' ? 'Google authorization was cancelled.' : 'Google authorization failed.');
    this.name = 'GoogleAuthorizationError';
    this.kind = kind;
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const loaded = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        scriptPromise = null;
        reject(new GoogleAuthorizationError('unavailable'));
      }
    };
    const failed = () => {
      scriptPromise = null;
      reject(new GoogleAuthorizationError('unavailable'));
    };

    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });

    if (!existing) {
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });

  return scriptPromise;
}

export function requestGoogleCalendarAccessToken(clientId: string): Promise<string> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) return Promise.reject(new GoogleAuthorizationError('unavailable'));

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleAuthorizationError('oauth'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(
          new GoogleAuthorizationError(
            error.type === 'popup_closed' ? 'cancelled' : 'oauth',
          ),
        );
      },
    });
    client.requestAccessToken();
  });
}
