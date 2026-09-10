# Fixed Staging slot

This repository keeps three distinct Vercel review surfaces:

| Surface | Git source | Canonical URL | Purpose |
| --- | --- | --- | --- |
| Pull Request Preview | feature / PR branch | generated `*.vercel.app` Preview URL | UI and general feature review |
| Fixed Staging | mutable `staging` branch | `https://staging.credentials.shimabell.dev` | OAuth, exact-Origin, and external-service integration review |
| Production | `main` | `https://credentials.shimabell.dev` | released application |

`staging` is a single mutable verification slot, not a release/integration branch. It points directly to the selected PR HEAD SHA and does not accumulate feature merges.

## Request a PR for Fixed Staging

1. Open **Actions**.
2. Select **Request PR for Fixed Staging**.
3. Run it from `main` and enter the open PR number.
4. The read-only request workflow writes only bounded request metadata to a short-lived artifact.
5. The trusted **Publish Fixed Staging** `workflow_run` publisher consumes that request, independently validates the PR, and moves `staging` to the exact PR HEAD SHA.
6. Vercel Git Integration observes the branch change and deploys `https://staging.credentials.shimabell.dev`.

Only open same-repository PRs targeting `main` are eligible. Fork PRs are rejected. If the PR receives another commit, submit a new request so the new HEAD is selected explicitly.

## Privilege boundary

The manual workflow is intentionally read-only and does not checkout repository or PR code. The workflow that owns `contents: write` is triggered by `workflow_run`, whose workflow definition executes from the trusted default-branch context.

The publisher accepts only a successful `workflow_dispatch` request from `main` in this repository. Its request artifact is bound to the triggering run ID, repository, and `refs/heads/main`; the publisher then queries GitHub again to validate the current PR state and HEAD.

The selected PR commit may be fetched as a Git object so `staging` can point to it, but selected PR files are never checked out or executed with the publisher's write token.

The selected PR code does execute later inside Vercel's `staging` Preview deployment. Therefore branch-scoped Staging environment values are a separate trust boundary. Do not expose Production secrets to Staging PR code.

## Ordering and race behavior

Publisher runs use `concurrency.queue: max` and are serialized by the `fixed-staging-deploy-slot` group. The script also checks for newer `main`-branch Staging requests before mutation.

A newer eligible request supersedes an older request. If the newer request later fails PR validation or deployment, the older request is not replayed automatically; the last successfully committed Staging occupant remains in place.

Every ref mutation uses `git push --force-with-lease`, binding the write to the observed `staging` SHA. A stale publisher or cleanup cannot blindly overwrite a newer occupant.

If the selected PR HEAD changes while a publisher is preparing the update, the run fails and requires a new explicit request.

## Cleanup

`Cleanup Staging` uses `pull_request_target: closed`, trusted base/default-branch automation, and never executes PR code.

Cleanup resets `staging` to current `main` only when:

```text
current staging HEAD == closed PR HEAD SHA
```

The decision intentionally does not depend on the PR's current base branch. If a PR was staged while targeting `main` and is later retargeted before close, its matching Staging slot can still be released safely. If a newer PR already owns Staging, cleanup skips.

## Vercel configuration

The external mapping remains:

```text
main    -> https://credentials.shimabell.dev
staging -> https://staging.credentials.shimabell.dev
```

`staging` is a Vercel **Preview** branch even though it has a stable Branch Domain. `VITE_GOOGLE_CLIENT_ID` therefore remains configured for Preview scoped to Git branch `staging`, using the same public Client ID as Production.

The repository workflow never calls the Vercel deployment API; Vercel Git Integration remains the hosting/deployment owner.

## Google OAuth

The existing OAuth Web Client keeps both exact Authorized JavaScript origins:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

Arbitrary `*.vercel.app` PR Preview origins are not registered. Normal PR Preview remains the default for non-OAuth review; Fixed Staging is requested only when stable-Origin integration testing is needed.

## Browser-origin state

Production and Fixed Staging remain different browser origins. Their `localStorage`, cookies, IndexedDB, and similar state are not shared. Remote integration resources that should be common across those origins must be rediscovered/reused explicitly rather than relying only on an origin-local identifier.
