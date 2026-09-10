import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStagingPushArgs,
  cleanupStaging,
  deployToStaging,
  newerManualRunExists,
  parsePrNumber,
  parseStagingRequest,
  shouldCleanupStaging,
  validateDeployablePullRequest,
} from '../scripts/staging-slot.mjs';

const REPOSITORY = 'ShimaBell0619/ms-credentials-tracker';
const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_C = 'cccccccccccccccccccccccccccccccccccccccc';

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
  assert.equal(shouldCleanupStaging(SHA_A, SHA_A), true);
  assert.equal(shouldCleanupStaging(SHA_B, SHA_A), false);
});

test('superseded request never fetches or mutates Staging', async () => {
  let gitCalled = false;
  const client = {
    async getPullRequest() { return pullRequest(); },
    async listManualRuns() {
      return [{ id: 101, event: 'workflow_dispatch', head_branch: 'main' }];
    },
  };
  const result = await deployToStaging({
    client,
    repository: REPOSITORY,
    prNumber: 40,
    workflowFile: 'request-staging.yml',
    runId: '100',
    githubRef: 'refs/heads/main',
    runGit: () => {
      gitCalled = true;
      return true;
    },
  });
  assert.equal(result.status, 'superseded');
  assert.equal(gitCalled, false);
});

test('cleanup does not overwrite a newer Staging occupant', async () => {
  let gitCalled = false;
  const client = {
    async getRef(branch) {
      assert.equal(branch, 'staging');
      return SHA_C;
    },
  };
  const result = await cleanupStaging({
    client,
    repository: REPOSITORY,
    closedPrNumber: 40,
    closedPrHeadRepo: REPOSITORY,
    closedPrHeadSha: SHA_B,
    runGit: () => {
      gitCalled = true;
      return true;
    },
  });
  assert.equal(result.status, 'skipped-newer-staging');
  assert.equal(gitCalled, false);
});

test('cleanup resets matching Staging independently of the PR current base branch', async () => {
  let stagingSha = SHA_B;
  const client = {
    async getRef(branch) {
      if (branch === 'staging') return stagingSha;
      if (branch === 'main') return SHA_A;
      throw new Error(`Unexpected branch ${branch}`);
    },
  };
  const runGit = (args) => {
    if (args[0] === 'fetch') return true;
    assert.deepEqual(args, buildStagingPushArgs(SHA_A, SHA_B));
    stagingSha = SHA_A;
    return true;
  };
  const result = await cleanupStaging({
    client,
    repository: REPOSITORY,
    closedPrNumber: 40,
    closedPrHeadRepo: REPOSITORY,
    closedPrHeadSha: SHA_B,
    runGit,
  });
  assert.deepEqual(result, { status: 'cleaned', mainSha: SHA_A });
  assert.equal(stagingSha, SHA_A);
});
