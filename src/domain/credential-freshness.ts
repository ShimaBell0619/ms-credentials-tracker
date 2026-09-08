import { differenceInCalendarDays, projectCredential, type CredentialProjection } from './credential-projection.ts';
import type { StoredCredential } from '../storage/local-credential-store.ts';

export interface TranscriptRefreshState {
  shouldPrompt: boolean;
  credentials: CredentialProjection[];
}

function isTranscriptSource(record: StoredCredential): boolean {
  return record.source !== 'manual';
}

export function buildTranscriptRefreshState(
  records: StoredCredential[],
  referenceDate: string,
  repeatAfterDays = 30,
): TranscriptRefreshState {
  const credentials = records
    .filter((record) => !record.archivedAt && isTranscriptSource(record))
    .map((record) => ({ record, projection: projectCredential(record, referenceDate) }))
    .filter(
      (entry): entry is { record: StoredCredential; projection: CredentialProjection } =>
        entry.projection !== null &&
        entry.projection.renewalOpensOn !== null &&
        entry.projection.renewalOpensOn <= referenceDate,
    )
    .filter(({ record, projection }) => {
      const lastConfirmedOn = record.lastTranscriptConfirmedOn;
      if (!lastConfirmedOn || lastConfirmedOn < (projection.renewalOpensOn ?? referenceDate)) {
        return true;
      }
      return differenceInCalendarDays(referenceDate, lastConfirmedOn) >= repeatAfterDays;
    })
    .map(({ projection }) => projection)
    .sort((left, right) =>
      (left.currentExpiresOn ?? '9999-12-31').localeCompare(right.currentExpiresOn ?? '9999-12-31'),
    );

  return { shouldPrompt: credentials.length > 0, credentials };
}
