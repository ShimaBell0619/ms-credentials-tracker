export type TranscriptShareUrlValidation =
  | { ok: true; url: string }
  | { ok: false; error: 'empty' | 'invalidUrl' | 'unsupportedHost' | 'unsupportedProtocol' | 'unsupportedPath' };

const TRANSCRIPT_PATH = /^\/(?:[a-z]{2}-[a-z]{2}\/)?users\/[^/?#]+\/transcript\/[^/?#]+\/?$/i;

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
  if (!TRANSCRIPT_PATH.test(url.pathname)) {
    return { ok: false, error: 'unsupportedPath' };
  }

  url.search = '';
  url.hash = '';
  return { ok: true, url: url.toString() };
}
