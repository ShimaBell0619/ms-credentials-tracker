import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStagingPushArgs,
  cleanupStaging,
  deployToStaging,
  newerManualRunExists,
  parsePrNumber,
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

test('PR number parsing rejects ambiguous or non-positive inputs', () => {
  assert.equal(parsePrNumber('42'), 42);
  for (const value of ['', '0', '-1', '12x', '1.5']) {
    assert.throws(() => parsePrNumber(value));
  }
});

test('deployable PR validation requires an open same-repository PR targeting main', () => {
  assert.equal(validateDeployablePullRequest(pullRequest(), REPOSITORY), SHA_B);
  assert.throws(() => validateDeployablePullRequest(pullRequest({ state: 'closed' }), REPOSITORY));
  assert.throws(() => validateDeployablePullRequest(pullRequest({ baseRef: 'release' }), REPOSITORY));
  assert.throws(() =>
    validateDeployablePullRequest(pullRequest({ headRepo: 'someone/fork' }), REPOSITORY),
  );
});

test('newer manual run detection makes an older explicit request yield', () => {
  assert.equal(
    newerManualRunExists('100', [
      { id: 99, event: 'workflow_dispatch' },
      { id: 101, event: 'workflow_dispatch' },
    ]),
    true,
  );
  assert.equal(newerManualRunExists('100', [{ id: 101, event: 'pull_request' }]), false);
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

test('superseded deploy run never fetches or mutates Staging', async () => {
  let gitCalled = false;
  const client = {
    async getPullRequest() {
      return pullRequest();
    },
    async listManualRuns() {
      return [
        { id: 100, event: 'workflow_dispatch' },
        { id: 101, event: 'workflow_dispatch' },
      ];
    },
  };

  const result = await deployToStaging({
    client,
    repository: REPOSITORY,
    prNumber: 40,
    workflowFile: 'deploy-staging.yml',
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

test('cleanup uses compare-and-swap semantics before resetting to main', async () => {
  let stagingSha = SHA_B;
  const seenCommands = [];
  const client = {
    async getRef(branch) {
      if (branch === 'staging') return stagingSha;
      if (branch === 'main') return SHA_A;
      throw new Error(`Unexpected branch ${branch}`);
    },
  };
  const runGit = (args) => {
    seenCommands.push(args);
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
  assert.equal(seenCommands.length, 2);
  assert.equal(stagingSha, SHA_A);
});
