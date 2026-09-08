import { getCredentialDefinition } from '../domain/credential-catalog.ts';
import type { TranscriptCredentialCandidate } from '../domain/transcript-import.ts';

const LEGACY_CREDENTIAL_STORAGE_KEY = 'ms-credentials-tracker:credentials:v1';
export const CREDENTIAL_STORAGE_KEY = 'ms-credentials-tracker:credentials:v2';
export const CREDENTIAL_STORAGE_CHANGED_EVENT = 'ms-credentials-tracker:credentials-changed';

export type CredentialImportSource =
  | 'learnTranscriptPaste'
  | 'learnTranscriptShareUrl'
  | 'learnTranscriptPdf';
export type CredentialSource = CredentialImportSource | 'manual';

export interface StoredCredential {
  id: string;
  credentialDefinitionId: string;
  source: CredentialSource;
  sourceRecordId: string | null;
  sourceTitle: string;
  firstEarnedOn: string;
  currentExpiresOn: string | null;
  confirmedAt: string;
  lastTranscriptConfirmedOn: string | null;
  manualOverrideAt: string | null;
  archivedAt: string | null;
}

export interface StoredCredentialHistory {
  id: string;
  userCredentialId: string;
  type: 'earned' | 'renewed' | 'corrected';
  occurredOn: string;
  previousExpiresOn: string | null;
  resultingExpiresOn: string | null;
  source: 'manual' | 'microsoftImport';
  recordedAt: string;
}

interface CredentialStorageEnvelopeV1 {
  version: 1;
  credentials: Array<{
    id: string;
    credentialDefinitionId: string;
    source: CredentialImportSource;
    sourceRecordId: string | null;
    sourceTitle: string;
    firstEarnedOn: string;
    currentExpiresOn: string | null;
    confirmedAt: string;
  }>;
}

interface CredentialStorageEnvelopeV2 {
  version: 2;
  credentials: StoredCredential[];
  history: StoredCredentialHistory[];
}

export interface CredentialStorageState {
  credentials: StoredCredential[];
  history: StoredCredentialHistory[];
}

export interface SaveCredentialResult {
  credentials: StoredCredential[];
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCount: number;
  conflictCount: number;
}

export interface ManualCredentialInput {
  credentialDefinitionId: string;
  firstEarnedOn: string;
  currentExpiresOn: string | null;
}

function isImportSource(value: unknown): value is CredentialImportSource {
  return (
    value === 'learnTranscriptPaste' ||
    value === 'learnTranscriptShareUrl' ||
    value === 'learnTranscriptPdf'
  );
}

function isSupportedSource(value: unknown): value is CredentialSource {
  return isImportSource(value) || value === 'manual';
}

function localDateOnly(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function defaultIdFactory(): string {
  return crypto.randomUUID();
}

function isStoredCredential(value: unknown): value is StoredCredential {
  if (!value || typeof value !== 'object') return false;
  const credential = value as Partial<StoredCredential>;
  return (
    typeof credential.id === 'string' &&
    typeof credential.credentialDefinitionId === 'string' &&
    isSupportedSource(credential.source) &&
    typeof credential.sourceTitle === 'string' &&
    typeof credential.firstEarnedOn === 'string' &&
    typeof credential.confirmedAt === 'string' &&
    (credential.currentExpiresOn === null || typeof credential.currentExpiresOn === 'string') &&
    (credential.lastTranscriptConfirmedOn === null ||
      typeof credential.lastTranscriptConfirmedOn === 'string') &&
    (credential.manualOverrideAt === null || typeof credential.manualOverrideAt === 'string') &&
    (credential.archivedAt === null || typeof credential.archivedAt === 'string')
  );
}

function readJson(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function migrateLegacyEnvelope(value: unknown): CredentialStorageState | null {
  if (!value || typeof value !== 'object') return null;
  const envelope = value as Partial<CredentialStorageEnvelopeV1>;
  if (envelope.version !== 1 || !Array.isArray(envelope.credentials)) return null;

  const credentials = envelope.credentials
    .filter(
      (credential) =>
        credential &&
        typeof credential.id === 'string' &&
        typeof credential.credentialDefinitionId === 'string' &&
        isImportSource(credential.source) &&
        typeof credential.sourceTitle === 'string' &&
        typeof credential.firstEarnedOn === 'string' &&
        typeof credential.confirmedAt === 'string',
    )
    .map<StoredCredential>((credential) => ({
      ...credential,
      lastTranscriptConfirmedOn: credential.confirmedAt.slice(0, 10),
      manualOverrideAt: null,
      archivedAt: null,
    }));

  return { credentials, history: [] };
}

export function loadCredentialStorageState(
  storage: Storage = window.localStorage,
): CredentialStorageState {
  const current = readJson(storage, CREDENTIAL_STORAGE_KEY);
  if (current && typeof current === 'object') {
    const envelope = current as Partial<CredentialStorageEnvelopeV2>;
    if (envelope.version === 2 && Array.isArray(envelope.credentials)) {
      return {
        credentials: envelope.credentials.filter(isStoredCredential),
        history: Array.isArray(envelope.history) ? envelope.history : [],
      };
    }
  }

  return migrateLegacyEnvelope(readJson(storage, LEGACY_CREDENTIAL_STORAGE_KEY)) ?? {
    credentials: [],
    history: [],
  };
}

export function loadStoredCredentials(storage: Storage = window.localStorage): StoredCredential[] {
  return loadCredentialStorageState(storage).credentials;
}

export function loadStoredCredentialHistory(
  storage: Storage = window.localStorage,
): StoredCredentialHistory[] {
  return loadCredentialStorageState(storage).history;
}

function persistState(state: CredentialStorageState, storage: Storage): void {
  const envelope: CredentialStorageEnvelopeV2 = {
    version: 2,
    credentials: state.credentials,
    history: state.history,
  };
  storage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(envelope));
  storage.removeItem(LEGACY_CREDENTIAL_STORAGE_KEY);
  notifyCredentialStorageChanged(storage);
}

function candidateIdentity(candidate: TranscriptCredentialCandidate): string {
  if (candidate.externalNumber) return `learn:${candidate.externalNumber}`;
  return `learn:${candidate.matchedDefinitionId}:${candidate.earnedOn}`;
}

function notifyCredentialStorageChanged(storage: Storage): void {
  if (typeof window === 'undefined' || storage !== window.localStorage) return;
  window.dispatchEvent(new Event(CREDENTIAL_STORAGE_CHANGED_EVENT));
}

function candidateFactsDiffer(
  existing: StoredCredential,
  candidate: TranscriptCredentialCandidate,
): boolean {
  return (
    existing.credentialDefinitionId !== candidate.matchedDefinitionId ||
    existing.firstEarnedOn !== candidate.earnedOn ||
    existing.currentExpiresOn !== candidate.expiresOn
  );
}

export function saveConfirmedCredentialCandidates(
  candidates: TranscriptCredentialCandidate[],
  source: CredentialImportSource = 'learnTranscriptPdf',
  storage: Storage = window.localStorage,
  now: Date = new Date(),
): SaveCredentialResult {
  const state = loadCredentialStorageState(storage);
  const byId = new Map(state.credentials.map((credential) => [credential.id, credential] as const));
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;
  const nowIso = now.toISOString();
  const confirmedOn = localDateOnly(now);

  for (const candidate of candidates) {
    if (candidate.matchStatus !== 'matched' || !candidate.matchedDefinitionId || !candidate.earnedOn) {
      skippedCount += 1;
      continue;
    }

    const id = candidateIdentity(candidate);
    const existing = byId.get(id);
    if (!existing) {
      const credential: StoredCredential = {
        id,
        credentialDefinitionId: candidate.matchedDefinitionId,
        source,
        sourceRecordId: candidate.externalNumber,
        sourceTitle: candidate.detectedTitle,
        firstEarnedOn: candidate.earnedOn,
        currentExpiresOn: candidate.expiresOn,
        confirmedAt: nowIso,
        lastTranscriptConfirmedOn: confirmedOn,
        manualOverrideAt: null,
        archivedAt: null,
      };
      state.credentials.push(credential);
      byId.set(id, credential);
      addedCount += 1;
      continue;
    }

    const differs = candidateFactsDiffer(existing, candidate);
    if (existing.manualOverrideAt && differs) {
      conflictCount += 1;
      continue;
    }

    existing.source = source;
    existing.sourceRecordId = candidate.externalNumber;
    existing.sourceTitle = candidate.detectedTitle;
    existing.lastTranscriptConfirmedOn = confirmedOn;
    existing.confirmedAt = nowIso;
    if (differs) {
      existing.credentialDefinitionId = candidate.matchedDefinitionId;
      existing.firstEarnedOn = candidate.earnedOn;
      existing.currentExpiresOn = candidate.expiresOn;
      existing.manualOverrideAt = null;
      updatedCount += 1;
    } else {
      existing.manualOverrideAt = null;
      unchangedCount += 1;
    }
  }

  persistState(state, storage);
  return {
    credentials: state.credentials,
    addedCount,
    updatedCount,
    unchangedCount,
    skippedCount,
    conflictCount,
  };
}

export function createManualCredential(
  input: ManualCredentialInput,
  storage: Storage = window.localStorage,
  now: Date = new Date(),
  idFactory: () => string = defaultIdFactory,
): StoredCredential {
  const definition = getCredentialDefinition(input.credentialDefinitionId);
  if (!definition) throw new Error('Unknown credential definition.');
  if (!input.firstEarnedOn) throw new Error('Earned date is required.');
  if (definition.validityPolicy.type === 'expiring' && !input.currentExpiresOn) {
    throw new Error('Expiry date is required for an expiring credential.');
  }

  const state = loadCredentialStorageState(storage);
  const nowIso = now.toISOString();
  const id = `manual:${idFactory()}`;
  const credential: StoredCredential = {
    id,
    credentialDefinitionId: definition.id,
    source: 'manual',
    sourceRecordId: null,
    sourceTitle: definition.canonicalTitle,
    firstEarnedOn: input.firstEarnedOn,
    currentExpiresOn:
      definition.validityPolicy.type === 'nonExpiring' ? null : input.currentExpiresOn,
    confirmedAt: nowIso,
    lastTranscriptConfirmedOn: null,
    manualOverrideAt: nowIso,
    archivedAt: null,
  };

  state.credentials.push(credential);
  state.history.push({
    id: `history:${idFactory()}`,
    userCredentialId: id,
    type: 'earned',
    occurredOn: input.firstEarnedOn,
    previousExpiresOn: null,
    resultingExpiresOn: credential.currentExpiresOn,
    source: 'manual',
    recordedAt: nowIso,
  });
  persistState(state, storage);
  return credential;
}

export function updateCredentialFacts(
  credentialId: string,
  input: ManualCredentialInput,
  storage: Storage = window.localStorage,
  now: Date = new Date(),
  idFactory: () => string = defaultIdFactory,
): StoredCredential {
  const definition = getCredentialDefinition(input.credentialDefinitionId);
  if (!definition) throw new Error('Unknown credential definition.');
  if (!input.firstEarnedOn) throw new Error('Earned date is required.');
  if (definition.validityPolicy.type === 'expiring' && !input.currentExpiresOn) {
    throw new Error('Expiry date is required for an expiring credential.');
  }

  const state = loadCredentialStorageState(storage);
  const credential = state.credentials.find((record) => record.id === credentialId);
  if (!credential) throw new Error('Credential not found.');

  const nextExpiresOn =
    definition.validityPolicy.type === 'nonExpiring' ? null : input.currentExpiresOn;
  const changed =
    credential.credentialDefinitionId !== definition.id ||
    credential.firstEarnedOn !== input.firstEarnedOn ||
    credential.currentExpiresOn !== nextExpiresOn;
  if (!changed) return credential;

  const nowIso = now.toISOString();
  const previousExpiresOn = credential.currentExpiresOn;
  credential.credentialDefinitionId = definition.id;
  credential.sourceTitle = definition.canonicalTitle;
  credential.firstEarnedOn = input.firstEarnedOn;
  credential.currentExpiresOn = nextExpiresOn;
  credential.confirmedAt = nowIso;
  credential.manualOverrideAt = nowIso;

  state.history.push({
    id: `history:${idFactory()}`,
    userCredentialId: credential.id,
    type: 'corrected',
    occurredOn: localDateOnly(now),
    previousExpiresOn,
    resultingExpiresOn: nextExpiresOn,
    source: 'manual',
    recordedAt: nowIso,
  });
  persistState(state, storage);
  return credential;
}

export function setCredentialArchived(
  credentialId: string,
  archived: boolean,
  storage: Storage = window.localStorage,
  now: Date = new Date(),
): StoredCredential {
  const state = loadCredentialStorageState(storage);
  const credential = state.credentials.find((record) => record.id === credentialId);
  if (!credential) throw new Error('Credential not found.');

  credential.archivedAt = archived ? now.toISOString() : null;
  credential.confirmedAt = now.toISOString();
  persistState(state, storage);
  return credential;
}
