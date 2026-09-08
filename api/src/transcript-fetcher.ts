import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { normalizeMicrosoftLearnTranscriptShareUrl } from '../../src/domain/transcript-share-url.ts';

export const DEFAULT_TRANSCRIPT_TIMEOUT_MS = 8_000;
export const DEFAULT_TRANSCRIPT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_TRANSCRIPT_MAX_REDIRECTS = 3;

export type TranscriptFetchErrorCode =
  | 'invalidTranscriptUrl'
  | 'privateDestination'
  | 'tooManyRedirects'
  | 'missingRedirectLocation'
  | 'timeout'
  | 'upstreamFailure'
  | 'unexpectedContentType'
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
  maxRedirects?: number;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
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
    if (high !== undefined && low !== undefined && Number.isInteger(high) && Number.isInteger(low)) {
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

function validatedUrl(value: string): URL {
  const result = normalizeMicrosoftLearnTranscriptShareUrl(value);
  if (!result.ok) throw new TranscriptFetchError('invalidTranscriptUrl');
  return new URL(result.url);
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

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
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
  const maxRedirects = options.maxRedirects ?? DEFAULT_TRANSCRIPT_MAX_REDIRECTS;
  const fetchImpl = dependencies.fetch ?? fetch;
  const resolver = dependencies.resolveHostname ?? ((hostname) => lookup(hostname, { all: true }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let currentUrl = validatedUrl(inputUrl);

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      await assertPublicDestination(currentUrl.hostname, resolver);
      const response = await fetchImpl(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'ms-credentials-tracker-transcript-fetcher/1.0',
        },
      });

      if (isRedirect(response.status)) {
        if (redirectCount === maxRedirects) {
          throw new TranscriptFetchError('tooManyRedirects');
        }
        const location = response.headers.get('location');
        if (!location) throw new TranscriptFetchError('missingRedirectLocation');
        currentUrl = validatedUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) throw new TranscriptFetchError('upstreamFailure');
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
        throw new TranscriptFetchError('unexpectedContentType');
      }
      return await readBodyWithLimit(response, maxBytes);
    }
  } catch (error) {
    normalizeFetchFailure(error);
  } finally {
    clearTimeout(timeout);
  }

  throw new TranscriptFetchError('upstreamFailure');
}
