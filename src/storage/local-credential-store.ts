import type { TranscriptCredentialCandidate } from '../domain/transcript-import.ts';

export const CREDENTIAL_STORAGE_KEY = 'ms-credentials-tracker:credentials:v1';

export type CredentialImportSource =
  | 'learnTranscriptPaste'
  | 'learnTranscriptShareUrl'
  | 'learnTranscriptPdf';

export interface StoredCredential {
  id: string;
  credentialDefinitionId: string;
  source: CredentialImportSource;
  sourceRecordId: string | null;
  sourceTitle: string;
  firstEarnedOn: string;
  currentExpiresOn: string | null;
  confirmedAt: string;
}

interface CredentialStorageEnvelope {
  version: 1;
  credentials: StoredCredential[];
}

export interface SaveCredentialResult {
  credentials: StoredCredential[];
  addedCount: number;
  skippedCount: number;
}

function isSupportedSource(value: unknown): value is CredentialImportSource {
  return (
    value === 'learnTranscriptPaste' ||
    value === 'learnTranscriptShareUrl' ||
    value === 'learnTranscriptPdf'
  );
}

export function loadStoredCredentials(storage: Storage = window.localStorage): StoredCredential[] {
  const raw = storage.getItem(CREDENTIAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<CredentialStorageEnvelope>;
    if (parsed.version !== 1 || !Array.isArray(parsed.credentials)) return [];
    return parsed.credentials.filter(
      (credential): credential is StoredCredential =>
        typeof credential?.id === 'string' &&
        typeof credential?.credentialDefinitionId === 'string' &&
        isSupportedSource(credential?.source) &&
        typeof credential?.sourceTitle === 'string' &&
        typeof credential?.firstEarnedOn === 'string' &&
        typeof credential?.confirmedAt === 'string',
    );
  } catch {
    return [];
  }
}

function candidateIdentity(candidate: TranscriptCredentialCandidate): string {
  if (candidate.externalNumber) return `learn:${candidate.externalNumber}`;
  return `learn:${candidate.matchedDefinitionId}:${candidate.earnedOn}`;
}

export function saveConfirmedCredentialCandidates(
  candidates: TranscriptCredentialCandidate[],
  source: CredentialImportSource = 'learnTranscriptPdf',
  storage: Storage = window.localStorage,
  now: Date = new Date(),
): SaveCredentialResult {
  const existing = loadStoredCredentials(storage);
  const existingIds = new Set(existing.map((credential) => credential.id));
  const additions: StoredCredential[] = [];
  let skippedCount = 0;

  for (const candidate of candidates) {
    if (candidate.matchStatus !== 'matched' || !candidate.matchedDefinitionId || !candidate.earnedOn) {
      skippedCount += 1;
      continue;
    }

    const id = candidateIdentity(candidate);
    if (existingIds.has(id)) {
      skippedCount += 1;
      continue;
    }

    existingIds.add(id);
    additions.push({
      id,
      credentialDefinitionId: candidate.matchedDefinitionId,
      source,
      sourceRecordId: candidate.externalNumber,
      sourceTitle: candidate.detectedTitle,
      firstEarnedOn: candidate.earnedOn,
      currentExpiresOn: candidate.expiresOn,
      confirmedAt: now.toISOString(),
    });
  }

  const credentials = [...existing, ...additions];
  const envelope: CredentialStorageEnvelope = { version: 1, credentials };
  storage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(envelope));

  return { credentials, addedCount: additions.length, skippedCount };
}
