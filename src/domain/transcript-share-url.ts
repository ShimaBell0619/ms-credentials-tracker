export type TranscriptShareUrlValidation =
  | { ok: true; url: string }
  | {
      ok: false;
      error:
        | 'empty'
        | 'invalidUrl'
        | 'unsupportedHost'
        | 'unsupportedProtocol'
        | 'unsupportedPort'
        | 'unsupportedCredentials'
        | 'unsupportedPath';
    };

const TRANSCRIPT_PATH =
  /^\/(?:[a-z]{2}-[a-z]{2}\/)?users\/[a-z0-9][a-z0-9._-]{0,127}\/transcript\/[a-z0-9][a-z0-9_-]{0,255}\/?$/i;

export function normalizeMicrosoftLearnTranscriptShareUrl(value: string): TranscriptShareUrlValidation {
  const input = value.trim();
  if (!input) return { ok: false, error: 'empty' };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: 'invalidUrl' };
  }

  if (url.protocol !== 'https:') return { ok: false, error: 'unsupportedProtocol' };
  if (url.hostname.toLowerCase() !== 'learn.microsoft.com') {
    return { ok: false, error: 'unsupportedHost' };
  }
  if (url.port) return { ok: false, error: 'unsupportedPort' };
  if (url.username || url.password) return { ok: false, error: 'unsupportedCredentials' };
  if (!TRANSCRIPT_PATH.test(url.pathname)) {
    return { ok: false, error: 'unsupportedPath' };
  }

  url.search = '';
  url.hash = '';
  return { ok: true, url: url.toString() };
}
