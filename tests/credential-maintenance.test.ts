import assert from 'node:assert/strict';
import test from 'node:test';
import { matchCredentialDefinition } from '../src/domain/credential-catalog.ts';
import { buildTranscriptRefreshState } from '../src/domain/credential-freshness.ts';
import type { TranscriptCredentialCandidate } from '../src/domain/transcript-import.ts';
import {
  CREDENTIAL_STORAGE_KEY,
  createManualCredential,
  loadStoredCredentialHistory,
  loadStoredCredentials,
  saveConfirmedCredentialCandidates,
  setCredentialArchived,
  updateCredentialFacts,
} from '../src/storage/local-credential-store.ts';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

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
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function candidate(expiresOn = '2027-03-15'): TranscriptCredentialCandidate {
  return {
    kind: 'certification',
    detectedTitle: 'Microsoft Certified: Azure Administrator Associate',
    externalNumber: 'ABCDEF123456',
    earnedOn: '2025-03-15',
    expiresOn,
    matchedDefinitionId: 'cert.azure-administrator-associate',
    matchStatus: 'matched',
  };
}

test('re-import updates an existing credential instead of skipping the new expiry', () => {
  const storage = new MemoryStorage();
  saveConfirmedCredentialCandidates(
    [candidate('2027-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2026-09-15T10:00:00Z'),
  );

  const result = saveConfirmedCredentialCandidates(
    [candidate('2028-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2027-03-01T10:00:00Z'),
  );

  assert.equal(result.updatedCount, 1);
  assert.equal(result.addedCount, 0);
  assert.equal(loadStoredCredentials(storage)[0]?.currentExpiresOn, '2028-03-15');
});

test('freshness prompt starts when renewal opens, is suppressed by re-import, and returns after 30 days', () => {
  const storage = new MemoryStorage();
  saveConfirmedCredentialCandidates(
    [candidate('2027-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2026-08-01T10:00:00Z'),
  );

  assert.equal(buildTranscriptRefreshState(loadStoredCredentials(storage), '2026-09-14').shouldPrompt, false);
  assert.equal(buildTranscriptRefreshState(loadStoredCredentials(storage), '2026-09-15').shouldPrompt, true);

  saveConfirmedCredentialCandidates(
    [candidate('2027-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2026-09-15T10:00:00Z'),
  );
  assert.equal(buildTranscriptRefreshState(loadStoredCredentials(storage), '2026-10-14').shouldPrompt, false);
  assert.equal(buildTranscriptRefreshState(loadStoredCredentials(storage), '2026-10-15').shouldPrompt, true);
});

test('manual correction blocks a conflicting Transcript overwrite', () => {
  const storage = new MemoryStorage();
  saveConfirmedCredentialCandidates(
    [candidate('2027-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2026-09-15T10:00:00Z'),
  );
  const imported = loadStoredCredentials(storage)[0];
  assert.ok(imported);

  updateCredentialFacts(
    imported.id,
    {
      credentialDefinitionId: imported.credentialDefinitionId,
      firstEarnedOn: imported.firstEarnedOn,
      currentExpiresOn: '2027-04-01',
    },
    storage,
    new Date('2026-09-16T10:00:00Z'),
    () => 'history-1',
  );

  const result = saveConfirmedCredentialCandidates(
    [candidate('2027-03-15')],
    'learnTranscriptPdf',
    storage,
    new Date('2026-09-17T10:00:00Z'),
  );
  assert.equal(result.conflictCount, 1);
  assert.equal(loadStoredCredentials(storage)[0]?.currentExpiresOn, '2027-04-01');
});

test('manual credentials can be created, corrected, archived, and restored with correction history', () => {
  const storage = new MemoryStorage();
  const ids = ['credential-1', 'history-earned', 'history-corrected'];
  const nextId = () => ids.shift() ?? 'fallback';

  const created = createManualCredential(
    {
      credentialDefinitionId: 'cert.azure-administrator-associate',
      firstEarnedOn: '2025-01-01',
      currentExpiresOn: '2027-01-01',
    },
    storage,
    new Date('2026-09-08T10:00:00Z'),
    nextId,
  );
  assert.equal(created.source, 'manual');

  updateCredentialFacts(
    created.id,
    {
      credentialDefinitionId: created.credentialDefinitionId,
      firstEarnedOn: created.firstEarnedOn,
      currentExpiresOn: '2027-02-01',
    },
    storage,
    new Date('2026-09-09T10:00:00Z'),
    nextId,
  );
  assert.equal(loadStoredCredentialHistory(storage).length, 2);

  setCredentialArchived(created.id, true, storage, new Date('2026-09-10T10:00:00Z'));
  assert.ok(loadStoredCredentials(storage)[0]?.archivedAt);
  assert.equal(buildTranscriptRefreshState(loadStoredCredentials(storage), '2027-01-01').shouldPrompt, false);

  setCredentialArchived(created.id, false, storage, new Date('2026-09-11T10:00:00Z'));
  assert.equal(loadStoredCredentials(storage)[0]?.archivedAt, null);
  assert.ok(storage.getItem(CREDENTIAL_STORAGE_KEY));
});

test('expanded catalog matches current credential titles without fuzzy guessing', () => {
  assert.equal(
    matchCredentialDefinition('Microsoft Certified: Fabric Data Engineer Associate')?.id,
    'cert.fabric-data-engineer-associate',
  );
  assert.equal(
    matchCredentialDefinition('Microsoft 認定: アイデンティティおよびアクセス管理者アソシエイト')?.id,
    'cert.identity-access-administrator-associate',
  );
  assert.equal(matchCredentialDefinition('Microsoft Certified: Similar But Unknown'), null);
});
