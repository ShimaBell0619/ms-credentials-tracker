import type { HttpResponseInit } from '@azure/functions';
import {
  fetchMicrosoftLearnTranscript,
  TranscriptFetchError,
  type TranscriptFetchDependencies,
} from './transcript-fetcher.ts';

export const DEFAULT_ALLOWED_ORIGIN = 'https://shimabell0619.github.io';

export interface TranscriptRequest {
  method: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export interface TranscriptEndpointDependencies extends TranscriptFetchDependencies {
  allowedOrigin?: string;
}

function responseHeaders(origin: string | null, allowedOrigin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'cache-control': 'no-store',
    vary: 'Origin',
    'x-content-type-options': 'nosniff',
  };
  if (origin === allowedOrigin) headers['access-control-allow-origin'] = allowedOrigin;
  return headers;
}

function errorStatus(error: TranscriptFetchError): number {
  if (error.code === 'invalidTranscriptUrl') return 400;
  if (error.code === 'timeout') return 504;
  if (error.code === 'responseTooLarge') return 413;
  return 502;
}

export async function handleTranscriptRequest(
  request: TranscriptRequest,
  dependencies: TranscriptEndpointDependencies = {},
): Promise<HttpResponseInit> {
  const allowedOrigin = dependencies.allowedOrigin ?? process.env.ALLOWED_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN;
  const origin = request.headers.get('origin');
  const headers = responseHeaders(origin, allowedOrigin);

  if (origin && origin !== allowedOrigin) {
    return { status: 403, headers, jsonBody: { error: 'originNotAllowed' } };
  }

  if (request.method.toUpperCase() === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        ...headers,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      },
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { status: 400, headers, jsonBody: { error: 'invalidRequest' } };
  }

  const url =
    typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string'
      ? body.url
      : null;
  if (!url || url.length > 2_048) {
    return { status: 400, headers, jsonBody: { error: 'invalidRequest' } };
  }

  try {
    const content = await fetchMicrosoftLearnTranscript(url, {}, dependencies);
    return { status: 200, headers, jsonBody: { content } };
  } catch (error) {
    const normalized =
      error instanceof TranscriptFetchError ? error : new TranscriptFetchError('upstreamFailure');
    return { status: errorStatus(normalized), headers, jsonBody: { error: normalized.code } };
  }
}
