import { normalizeMicrosoftLearnTranscriptShareUrl } from '../domain/transcript-share-url.ts';

export type TranscriptApiError =
  | 'notConfigured'
  | 'invalidEndpoint'
  | 'requestFailed'
  | 'upstreamRejected';

export type TranscriptApiResult =
  | { ok: true; html: string }
  | { ok: false; error: TranscriptApiError; status: number | null };

export interface TranscriptApiDependencies {
  fetch?: typeof fetch;
}

export function normalizeTranscriptApiUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      return null;
    }
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export async function fetchTranscriptThroughApi(
  endpointValue: string | undefined,
  shareUrlValue: string,
  dependencies: TranscriptApiDependencies = {},
): Promise<TranscriptApiResult> {
  const endpoint = normalizeTranscriptApiUrl(endpointValue);
  if (!endpoint) {
    return {
      ok: false,
      error: endpointValue?.trim() ? 'invalidEndpoint' : 'notConfigured',
      status: null,
    };
  }

  const shareUrl = normalizeMicrosoftLearnTranscriptShareUrl(shareUrlValue);
  if (!shareUrl.ok) return { ok: false, error: 'upstreamRejected', status: 400 };

  try {
    const response = await (dependencies.fetch ?? fetch)(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: shareUrl.url }),
      credentials: 'omit',
      redirect: 'error',
    });

    if (!response.ok) {
      return { ok: false, error: 'upstreamRejected', status: response.status };
    }

    const payload = (await response.json()) as { content?: unknown };
    if (typeof payload.content !== 'string') {
      return { ok: false, error: 'requestFailed', status: response.status };
    }

    return { ok: true, html: payload.content };
  } catch {
    return { ok: false, error: 'requestFailed', status: null };
  }
}
