import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCredentialDashboard,
  projectCredential,
} from '../src/domain/credential-projection.ts';
import type { StoredCredential } from '../src/storage/local-credential-store.ts';

function storedCredential(
  credentialDefinitionId: string,
  currentExpiresOn: string | null,
  firstEarnedOn = '2024-01-01',
): StoredCredential {
  return {
    id: `test:${credentialDefinitionId}`,
    credentialDefinitionId,
    source: 'learnTranscriptPdf',
    sourceRecordId: null,
    sourceTitle: credentialDefinitionId,
    firstEarnedOn,
    currentExpiresOn,
    confirmedAt: '2026-09-08T00:00:00.000Z',
  };
}

test('derives renewal-window boundaries from the confirmed expiry fact', () => {
  const record = storedCredential('cert.azure-administrator-associate', '2027-03-15', '2020-01-01');

  const beforeWindow = projectCredential(record, '2026-09-14');
  assert.equal(beforeWindow?.renewalOpensOn, '2026-09-15');
  assert.equal(beforeWindow?.status, 'active');

  const windowOpens = projectCredential(record, '2026-09-15');
  assert.equal(windowOpens?.status, 'renewalAvailable');
  assert.equal(windowOpens?.daysUntilExpiry, 181);

  const expiresToday = projectCredential(record, '2027-03-15');
  assert.equal(expiresToday?.status, 'renewalAvailable');
  assert.equal(expiresToday?.daysUntilExpiry, 0);

  const expired = projectCredential(record, '2027-03-16');
  assert.equal(expired?.status, 'expired');
  assert.equal(expired?.daysUntilExpiry, -1);
});

test('keeps non-expiring credentials explicit regardless of stored expiry noise', () => {
  const projection = projectCredential(
    storedCredential('cert.azure-fundamentals', '2030-01-01'),
    '2026-09-08',
  );

  assert.equal(projection?.status, 'nonExpiring');
  assert.equal(projection?.currentExpiresOn, null);
  assert.equal(projection?.renewalOpensOn, null);
  assert.equal(projection?.daysUntilExpiry, null);
});

test('projects the next deadline and only events inside the next 90 days', () => {
  const dashboard = buildCredentialDashboard(
    [
      storedCredential('cert.azure-administrator-associate', '2026-11-20', '2023-11-19'),
      storedCredential('cert.azure-security-engineer-associate', '2026-12-28', '2025-12-27'),
      storedCredential('cert.azure-solutions-architect-expert', '2027-06-29', '2024-06-28'),
      storedCredential('cert.azure-fundamentals', null, '2023-07-16'),
    ],
    '2026-09-08',
  );

  assert.equal(dashboard.nextDeadline?.displayCode, 'AZ-104');
  assert.equal(dashboard.nextDeadline?.currentExpiresOn, '2026-11-20');
  assert.deepEqual(
    dashboard.scheduleEvents.map((event) => [event.kind, event.date, event.displayCode]),
    [['deadline', '2026-11-20', 'AZ-104']],
  );
});

test('includes a renewal-opening event exactly on the reference date', () => {
  const dashboard = buildCredentialDashboard(
    [storedCredential('cert.azure-solutions-architect-expert', '2027-03-08')],
    '2026-09-08',
  );

  assert.deepEqual(
    dashboard.scheduleEvents.map((event) => [event.kind, event.date]),
    [['renewal', '2026-09-08']],
  );
});
