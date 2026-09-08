import assert from 'node:assert/strict';
import test from 'node:test';
import type { TranscriptCredentialCandidate } from '../src/domain/transcript-import.ts';
import {
  CREDENTIAL_STORAGE_KEY,
  loadStoredCredentials,
  saveConfirmedCredentialCandidates,
} from '../src/storage/local-credential-store.ts';
import {
  fetchTranscriptThroughApi,
  normalizeTranscriptApiUrl,
} from '../src/transport/transcript-api.ts';

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const matchedCandidate: TranscriptCredentialCandidate = {
  kind: 'certification',
  detectedTitle: 'Microsoft Certified: Azure Administrator Associate',
  externalNumber: 'EXAMPLE-RECORD',
  earnedOn: '2026-03-14',
  expiresOn: '2027-03-15',
  matchedDefinitionId: 'cert.azure-administrator-associate',
  matchStatus: 'matched',
};

test('calls the configured transcript API without exposing the URL in the request target', async () => {
  let requestedUrl = '';
  let requestBody = '';
  const result = await fetchTranscriptThroughApi(
    'https://func.example.test/api/transcript?ignored=true',
    'https://learn.microsoft.com/ja-jp/users/example/transcript/share-token?tracking=true',
    {
      fetch: async (input, init) => {
        requestedUrl = input.toString();
        requestBody = String(init?.body);
        return Response.json({ content: '<html><body>Transcript</body></html>' });
      },
    },
  );

  assert.equal(requestedUrl, 'https://func.example.test/api/transcript');
  assert.deepEqual(JSON.parse(requestBody), {
    url: 'https://learn.microsoft.com/ja-jp/users/example/transcript/share-token',
  });
  assert.deepEqual(result, { ok: true, html: '<html><body>Transcript</body></html>' });
});

test('reports transcript API configuration and transport failures', async () => {
  assert.equal(normalizeTranscriptApiUrl('javascript:alert(1)'), null);
  assert.deepEqual(await fetchTranscriptThroughApi('', 'https://learn.microsoft.com/users/a/transcript/b'), {
    ok: false,
    error: 'notConfigured',
    status: null,
  });

  const result = await fetchTranscriptThroughApi(
    'https://func.example.test/api/transcript',
    'https://learn.microsoft.com/users/a/transcript/b',
    { fetch: async () => new Response(null, { status: 502 }) },
  );
  assert.deepEqual(result, { ok: false, error: 'upstreamRejected', status: 502 });
});

test('persists confirmed credentials once and skips duplicate imports', () => {
  const storage = new MemoryStorage();
  const now = new Date('2026-01-02T03:04:05.000Z');

  const first = saveConfirmedCredentialCandidates([matchedCandidate], 'learnTranscriptShareUrl', storage, now);
  const duplicate = saveConfirmedCredentialCandidates([matchedCandidate], 'learnTranscriptShareUrl', storage, now);

  assert.equal(first.addedCount, 1);
  assert.equal(duplicate.addedCount, 0);
  assert.equal(duplicate.skippedCount, 1);
  assert.equal(loadStoredCredentials(storage).length, 1);
  assert.match(storage.getItem(CREDENTIAL_STORAGE_KEY) ?? '', /cert\.azure-administrator-associate/);
});
