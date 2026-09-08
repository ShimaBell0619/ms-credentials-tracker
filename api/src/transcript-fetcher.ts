import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { normalizeMicrosoftLearnTranscriptShareUrl } from '../../src/domain/transcript-share-url.ts';

export const DEFAULT_TRANSCRIPT_TIMEOUT_MS = 8_000;
export const DEFAULT_TRANSCRIPT_MAX_BYTES = 2 * 1024 * 1024;

export type TranscriptFetchErrorCode =
  | 'invalidTranscriptUrl'
  | 'privateDestination'
  | 'timeout'
  | 'upstreamFailure'
  | 'unexpectedRedirect'
  | 'unexpectedContentType'
  | 'invalidJson'
  | 'responseTooLarge';

export class TranscriptFetchError extends Error {
  readonly code: TranscriptFetchErrorCode;

  constructor(code: TranscriptFetchErrorCode) {
    super(code);
    this.code = code;
    this.name = 'TranscriptFetchError';
  }
}

export interface TranscriptFetchDependencies {
  fetch?: typeof fetch;
  resolveHostname?: (hostname: string) => Promise<readonly { address: string; family: number }[]>;
}

export interface TranscriptFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  const [first = 0, second = 0, third = 0] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 0 && third === 0) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 192 && second === 168) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%', 1)[0] ?? '';
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (mapped.includes('.')) return isPublicIpv4(mapped);
    const [high, low] = mapped.split(':').map((part) => Number.parseInt(part, 16));
    if (
      high !== undefined &&
      low !== undefined &&
      Number.isInteger(high) &&
      Number.isInteger(low)
    ) {
      return isPublicIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
    }
    return false;
  }
  const firstHextet = Number.parseInt(normalized.split(':', 1)[0] ?? '', 16);
  if (!Number.isInteger(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff) return false;
  if (normalized.startsWith('2001:db8:') || normalized === '2001:db8::') return false;
  return true;
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

async function assertPublicDestination(
  hostname: string,
  resolver: NonNullable<TranscriptFetchDependencies['resolveHostname']>,
): Promise<void> {
  const addresses = await resolver(hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new TranscriptFetchError('privateDestination');
  }
}

export function buildMicrosoftLearnTranscriptApiUrl(inputUrl: string): URL {
  const result = normalizeMicrosoftLearnTranscriptShareUrl(inputUrl);
  if (!result.ok) throw new TranscriptFetchError('invalidTranscriptUrl');

  const shareUrl = new URL(result.url);
  const shareId = shareUrl.pathname.split('/').filter(Boolean).at(-1);
  if (!shareId) throw new TranscriptFetchError('invalidTranscriptUrl');

  const apiUrl = new URL(
    `/api/profiles/transcript/share/${encodeURIComponent(shareId)}`,
    'https://learn.microsoft.com',
  );
  apiUrl.searchParams.set('locale', 'en-us');
  return apiUrl;
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new TranscriptFetchError('responseTooLarge');
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new TranscriptFetchError('responseTooLarge');
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function normalizeFetchFailure(error: unknown): never {
  if (error instanceof TranscriptFetchError) throw error;
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    throw new TranscriptFetchError('timeout');
  }
  throw new TranscriptFetchError('upstreamFailure');
}

export async function fetchMicrosoftLearnTranscript(
  inputUrl: string,
  options: TranscriptFetchOptions = {},
  dependencies: TranscriptFetchDependencies = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TRANSCRIPT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_TRANSCRIPT_MAX_BYTES;
  const fetchImpl = dependencies.fetch ?? fetch;
  const resolver = dependencies.resolveHostname ?? ((hostname) => lookup(hostname, { all: true }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const apiUrl = buildMicrosoftLearnTranscriptApiUrl(inputUrl);

  try {
    await assertPublicDestination(apiUrl.hostname, resolver);
    const response = await fetchImpl(apiUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; ms-credentials-tracker/1.0)',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      throw new TranscriptFetchError('unexpectedRedirect');
    }
    if (!response.ok) throw new TranscriptFetchError('upstreamFailure');

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!/^application\/(?:[a-z0-9.+-]+\+)?json\b/i.test(contentType)) {
      throw new TranscriptFetchError('unexpectedContentType');
    }

    const body = await readBodyWithLimit(response, maxBytes);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new TranscriptFetchError('invalidJson');
    }
    if (typeof parsed !== 'object' || parsed === null) {
      throw new TranscriptFetchError('invalidJson');
    }

    return JSON.stringify(parsed);
  } catch (error) {
    normalizeFetchFailure(error);
  } finally {
    clearTimeout(timeout);
  }
}
