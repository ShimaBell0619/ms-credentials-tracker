import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTranscriptRequest, type TranscriptRequest } from '../src/transcript-endpoint.ts';
import {
  buildMicrosoftLearnTranscriptApiUrl,
  fetchMicrosoftLearnTranscript,
  isPublicIpAddress,
  TranscriptFetchError,
} from '../src/transcript-fetcher.ts';

const publicResolver = async () => [{ address: '13.107.246.40', family: 4 }] as const;

function responseJson(body: unknown = { certificationData: { activeCertifications: [] } }, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

function request(body: unknown, origin = 'https://shimabell0619.github.io'): TranscriptRequest {
  return {
    method: 'POST',
    headers: new Headers({ origin }),
    json: async () => body,
  };
}

test('derives the fixed Microsoft Learn transcript API URL from a validated share URL', () => {
  assert.equal(
    buildMicrosoftLearnTranscriptApiUrl(
      'https://learn.microsoft.com/ja-jp/users/example/transcript/share-id?tracking=true#section',
    ).toString(),
    'https://learn.microsoft.com/api/profiles/transcript/share/share-id?locale=en-us',
  );
});

test('fetches transcript JSON through the fixed Microsoft Learn API endpoint', async () => {
  const content = await fetchMicrosoftLearnTranscript(
    'https://learn.microsoft.com/ja-jp/users/example/transcript/share-id?tracking=true#section',
    {},
    {
      resolveHostname: publicResolver,
      fetch: async (input, init) => {
        assert.equal(
          input.toString(),
          'https://learn.microsoft.com/api/profiles/transcript/share/share-id?locale=en-us',
        );
        assert.equal(init?.redirect, 'manual');
        return responseJson({ certificationData: { activeCertifications: [{ name: 'Example' }] } });
      },
    },
  );

  assert.deepEqual(JSON.parse(content), {
    certificationData: { activeCertifications: [{ name: 'Example' }] },
  });
});

test('rejects redirects instead of following an unexpected upstream destination', async () => {
  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      {},
      {
        resolveHostname: publicResolver,
        fetch: async () =>
          new Response(null, { status: 302, headers: { location: 'https://example.com/internal' } }),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'unexpectedRedirect',
  );
});

test('rejects private and local destination addresses', async () => {
  assert.equal(isPublicIpAddress('127.0.0.1'), false);
  assert.equal(isPublicIpAddress('10.0.0.5'), false);
  assert.equal(isPublicIpAddress('169.254.169.254'), false);
  assert.equal(isPublicIpAddress('::1'), false);
  assert.equal(isPublicIpAddress('fd00::1'), false);
  assert.equal(isPublicIpAddress('::ffff:7f00:1'), false);
  assert.equal(isPublicIpAddress('2001:db8::1'), false);
  assert.equal(isPublicIpAddress('2603:1030:20e:3::23c'), true);
  assert.equal(isPublicIpAddress('13.107.246.40'), true);

  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      {},
      {
        resolveHostname: async () => [{ address: '127.0.0.1', family: 4 }],
        fetch: async () => responseJson(),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'privateDestination',
  );
});

test('enforces a whole-request timeout', async () => {
  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      { timeoutMs: 5 },
      {
        resolveHostname: publicResolver,
        fetch: async (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'timeout',
  );
});

test('rejects oversized, non-JSON, and malformed JSON upstream responses', async () => {
  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      { maxBytes: 8 },
      {
        resolveHostname: publicResolver,
        fetch: async () => responseJson({ value: 'this is too large' }),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'responseTooLarge',
  );

  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      {},
      {
        resolveHostname: publicResolver,
        fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'unexpectedContentType',
  );

  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      {},
      {
        resolveHostname: publicResolver,
        fetch: async () => new Response('{', { headers: { 'content-type': 'application/json' } }),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'invalidJson',
  );
});

test('returns transcript JSON with only the approved browser origin', async () => {
  const response = await handleTranscriptRequest(
    request({ url: 'https://learn.microsoft.com/users/example/transcript/share-id' }),
    {
      resolveHostname: publicResolver,
      fetch: async () => responseJson({ userName: 'example-user', certificationData: {} }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers?.['access-control-allow-origin'], 'https://shimabell0619.github.io');
  assert.deepEqual(JSON.parse(String((response.jsonBody as { content: string }).content)), {
    userName: 'example-user',
    certificationData: {},
  });
});

test('rejects an unapproved browser origin before fetching', async () => {
  let fetched = false;
  const response = await handleTranscriptRequest(
    request(
      { url: 'https://learn.microsoft.com/users/example/transcript/share-id' },
      'https://attacker.example',
    ),
    {
      resolveHostname: publicResolver,
      fetch: async () => {
        fetched = true;
        return responseJson();
      },
    },
  );

  assert.equal(response.status, 403);
  assert.equal(fetched, false);
  assert.equal(response.headers?.['access-control-allow-origin'], undefined);
});

test('maps timeout and oversized upstream responses to bounded transport failures', async () => {
  const timeout = await handleTranscriptRequest(
    request({ url: 'https://learn.microsoft.com/users/example/transcript/share-id' }),
    {
      resolveHostname: publicResolver,
      fetch: async () => {
        throw new DOMException('aborted', 'AbortError');
      },
    },
  );
  assert.equal(timeout.status, 504);

  const oversized = await handleTranscriptRequest(
    request({ url: 'https://learn.microsoft.com/users/example/transcript/share-id' }),
    {
      resolveHostname: publicResolver,
      fetch: async () =>
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'application/json', 'content-length': '3000000' },
        }),
    },
  );
  assert.equal(oversized.status, 413);
});
