import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTranscriptRequest, type TranscriptRequest } from '../src/transcript-endpoint.ts';
import {
  fetchMicrosoftLearnTranscript,
  isPublicIpAddress,
  TranscriptFetchError,
} from '../src/transcript-fetcher.ts';

const publicResolver = async () => [{ address: '13.107.246.40', family: 4 }] as const;

function responseHtml(body = '<html><body>Transcript</body></html>', init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
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

test('fetches a validated Microsoft Learn transcript', async () => {
  const content = await fetchMicrosoftLearnTranscript(
    'https://learn.microsoft.com/ja-jp/users/example/transcript/share-id?tracking=true#section',
    {},
    {
      resolveHostname: publicResolver,
      fetch: async (input) => {
        assert.equal(input.toString(), 'https://learn.microsoft.com/ja-jp/users/example/transcript/share-id');
        return responseHtml();
      },
    },
  );

  assert.equal(content, '<html><body>Transcript</body></html>');
});

test('rejects redirects away from the Microsoft Learn transcript allowlist', async () => {
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
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'invalidTranscriptUrl',
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
        fetch: async () => responseHtml(),
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

test('rejects an oversized transcript response', async () => {
  await assert.rejects(
    fetchMicrosoftLearnTranscript(
      'https://learn.microsoft.com/users/example/transcript/share-id',
      { maxBytes: 8 },
      {
        resolveHostname: publicResolver,
        fetch: async () => responseHtml('this body is larger than eight bytes'),
      },
    ),
    (error: unknown) => error instanceof TranscriptFetchError && error.code === 'responseTooLarge',
  );
});

test('returns transcript content with only the approved browser origin', async () => {
  const response = await handleTranscriptRequest(
    request({ url: 'https://learn.microsoft.com/users/example/transcript/share-id' }),
    {
      resolveHostname: publicResolver,
      fetch: async () => responseHtml(),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers?.['access-control-allow-origin'], 'https://shimabell0619.github.io');
  assert.deepEqual(response.jsonBody, { content: '<html><body>Transcript</body></html>' });
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
        return responseHtml();
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
          headers: { 'content-type': 'text/html', 'content-length': '3000000' },
        }),
    },
  );
  assert.equal(oversized.status, 413);
});
