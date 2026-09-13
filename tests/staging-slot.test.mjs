import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildStagingPushArgs,
  newerManualRunExists,
  parsePrNumber,
  parseStagingRequest,
  sourceMarkers,
  stagingOwnershipMatches,
  validateDeployablePullRequest,
} from '../scripts/staging-slot.mjs';

const REPOSITORY = 'ShimaBell0619/ms-credentials-tracker';
const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function pullRequest({ headSha = SHA_B, headRepo = REPOSITORY, state = 'open', baseRef = 'main' } = {}) {
  return {
    state,
    base: { ref: baseRef, repo: { full_name: REPOSITORY } },
    head: { sha: headSha, repo: { full_name: headRepo } },
  };
}

test('request artifact is bound to its main workflow run and repository', () => {
  const request = JSON.stringify({
    prNumber: 42,
    requestRunId: '100',
    repository: REPOSITORY,
    ref: 'refs/heads/main',
  });
  assert.equal(parseStagingRequest(request, { requestRunId: '100', repository: REPOSITORY }), 42);
  assert.throws(() => parseStagingRequest(request, { requestRunId: '101', repository: REPOSITORY }));
  assert.throws(() => parseStagingRequest(request, { requestRunId: '100', repository: 'other/app' }));
  assert.throws(() => parseStagingRequest(JSON.stringify({ ...JSON.parse(request), ref: 'refs/heads/feature' }), {
    requestRunId: '100',
    repository: REPOSITORY,
  }));
});

test('PR number parsing rejects ambiguous or non-positive inputs', () => {
  assert.equal(parsePrNumber('42'), 42);
  for (const value of ['', '0', '-1', '12x', '1.5']) assert.throws(() => parsePrNumber(value));
});

test('deployable PR validation requires an open same-repository PR targeting main', () => {
  assert.equal(validateDeployablePullRequest(pullRequest(), REPOSITORY), SHA_B);
  assert.throws(() => validateDeployablePullRequest(pullRequest({ state: 'closed' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(pullRequest({ baseRef: 'release' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(pullRequest({ headRepo: 'someone/fork' }), REPOSITORY));
});

test('only newer main-branch manual requests supersede an older request', () => {
  assert.equal(
    newerManualRunExists('100', [
      { id: 101, event: 'workflow_dispatch', head_branch: 'feature' },
      { id: 102, event: 'push', head_branch: 'main' },
    ]),
    false,
  );
  assert.equal(
    newerManualRunExists('100', [{ id: 101, event: 'workflow_dispatch', head_branch: 'main' }]),
    true,
  );
});

test('force-with-lease push is bound to the observed Staging SHA', () => {
  assert.deepEqual(buildStagingPushArgs(SHA_B, SHA_A), [
    'push',
    'origin',
    `${SHA_B}:refs/heads/staging`,
    `--force-with-lease=refs/heads/staging:${SHA_A}`,
  ]);
});

test('synthetic Staging provenance gives cleanup explicit PR ownership', () => {
  const message = [
    'Foundation Fixed Staging for PR #42',
    '',
    'Foundation-Fixed-Staging-PR: 42',
    `Source-PR-HEAD: ${SHA_A}`,
  ].join('\n');

  assert.equal(sourceMarkers(message, 42, SHA_A), true);
  assert.equal(sourceMarkers(message, 42, SHA_B), false);
  assert.equal(stagingOwnershipMatches(message, 42), true);
  assert.equal(stagingOwnershipMatches(message, 41), false);
});

test('helper preserves exact-source revalidation and content-identical synthetic invariants', () => {
  const helper = readFileSync('scripts/staging-slot.mjs', 'utf8');
  for (const marker of [
    'PR HEAD changed after exact-source validation',
    'PR HEAD changed before Staging mutation',
    "['commit-tree', sourceTree, '-p', sourceSha]",
    "['diff', '--quiet', sourceSha, syntheticSha]",
    'Foundation-Fixed-Staging-PR:',
    'Source-PR-HEAD:',
    '--force-with-lease=',
    'stagingOwnershipMatches(message, prNumber)',
  ]) {
    assert.ok(helper.includes(marker), `missing Fixed Staging invariant: ${marker}`);
  }
});
