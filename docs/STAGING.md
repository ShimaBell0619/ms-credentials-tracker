# Fixed Staging slot

This repository uses three distinct Vercel review surfaces. They serve different purposes and must not be collapsed into one deployment flow.

| Surface | Git source | Canonical URL | Purpose |
| --- | --- | --- | --- |
| Pull Request Preview | feature / PR branch | generated `*.vercel.app` Preview URL | UI, responsive layout, import, and general feature review |
| Fixed Staging | mutable `staging` branch | `https://staging.credentials.shimabell.dev` | OAuth, exact-Origin, and external-service integration review |
| Production | `main` | `https://credentials.shimabell.dev` | released application |

## Staging is a slot, not a release branch

`staging` does not accumulate feature PR merges and is not part of release history. It always points directly at one commit being evaluated.

Example:

```text
PR #20 HEAD = abc123
staging     = abc123

later:

PR #21 HEAD = def456
staging     = def456
```

Only one PR can occupy Fixed Staging at a time. Replacing the slot is intentional and does not merge either PR into `main`.

## Deploy a PR to Fixed Staging

The workflow is intentionally manual. Creating or updating a PR does not automatically claim the shared Staging slot.

1. Open the repository **Actions** tab.
2. Select **Deploy PR to Staging**.
3. Choose **Run workflow** from `main`.
4. Enter the open PR number.
5. Run the workflow.

The workflow resolves the PR through the GitHub API, validates that it is an open same-repository PR targeting `main`, and records its current HEAD SHA. Fork PRs are rejected.

The workflow then moves `staging` to that SHA. It does not build or publish the application itself: Vercel Git Integration observes the `staging` branch update and performs the deployment.

On success, the workflow writes the PR number, exact SHA, and Staging URL to the workflow summary and attempts to post the same deployment identity to the PR conversation.

## Security model

The Staging workflows have write permission because they must move the `staging` Git ref. That permission is deliberately isolated from PR code execution.

- The privileged workflow checks out `main` explicitly, not the selected PR HEAD.
- The selected PR commit may be fetched as a Git object so the ref can point to it, but its files are never checked out or executed by the privileged job.
- A manually selected PR must belong to this repository and target `main`; fork PRs are rejected.
- The manual workflow itself must be run from `main`.
- The workflow uses the repository `GITHUB_TOKEN`; no deployment secret or Google credential is required.

The Staging application is public for now. Vercel Deployment Protection is not part of this profile.

## Race and stale-run behavior

Fixed Staging is shared mutable state, so every ref mutation uses `git push --force-with-lease` rather than an unconditional force update.

This makes each mutation a compare-and-swap operation: the push succeeds only if `staging` still points to the SHA observed immediately before the mutation.

Manual deployments are also placed in the `fixed-staging-deploy-slot` GitHub Actions concurrency queue. Pending manual requests are retained and processed sequentially. Before mutating the branch, a run also checks for a newer manual workflow run; an older run yields instead of becoming the final Staging selection.

If the PR HEAD changes while a workflow is preparing the update, that run fails without silently switching to a different SHA. Run the workflow again to deploy the new PR HEAD explicitly.

## Cleanup after merge or close

`Cleanup Staging` runs when a Pull Request is closed, including merge.

Cleanup resets `staging` to the current `main` HEAD only when:

```text
current staging HEAD == closed PR HEAD SHA
```

The reset also uses `--force-with-lease`, so the equality check is atomic with the ref update.

Therefore this sequence is safe:

```text
PR #20 -> staging
PR #21 -> staging
PR #20 -> closed
```

When PR #20 closes, `staging` already points to PR #21, so PR #20 cleanup does nothing.

If cleanup succeeds:

```text
staging = current main HEAD
```

This leaves the branch in a known neutral state while keeping the branch and its Vercel Branch Domain available for the next explicit verification.

## Vercel configuration

Repository automation assumes the following Branch Domain mapping exists in the Vercel project:

```text
main    -> https://credentials.shimabell.dev
staging -> https://staging.credentials.shimabell.dev
```

Normal Vercel PR Preview Deployments remain enabled and unchanged.

The repository workflow does not call the Vercel deployment API. A Git push to `staging` remains the deployment trigger, preserving Vercel Git Integration as the hosting owner.

### Staging environment variables

A deployment from the `staging` Git branch is a Vercel **Preview** deployment, even though it has a stable Branch Domain. Production-only Vercel environment variables are therefore not sufficient for Staging.

`VITE_GOOGLE_CLIENT_ID` must be available to the `staging` Preview deployment. Prefer a Preview environment variable scoped specifically to Git branch `staging`, using the same Client ID value as Production. This keeps the fixed-Origin integration configuration explicit without changing normal PR Preview behavior.

After adding or changing the branch-scoped environment variable, create a new `staging` deployment so Vite rebuilds with the value.

## Google OAuth configuration

Production and Staging intentionally use the same Google OAuth Web Client / Client ID.

The Web Client must contain both exact Authorized JavaScript origins:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

Do not remove the Production origin when adding Staging. Do not add wildcard `*.vercel.app` origins, a client secret to this SPA, or a proxy workaround.

The regular Vercel PR Preview remains useful for non-OAuth review even though its generated Origin is not registered with Google.

## External setup checklist

Repository-side automation can be merged independently, but Fixed Staging is not usable for Google OAuth at its canonical URL until all external settings are complete:

- Vercel domain: add `staging.credentials.shimabell.dev` to the project and associate it with Git branch `staging`.
- Vercel environment variable: make `VITE_GOOGLE_CLIENT_ID` available to Preview deployments for Git branch `staging`, using the same Client ID as Production.
- Google Cloud: add `https://staging.credentials.shimabell.dev` to the existing OAuth Web Client's Authorized JavaScript origins while preserving `https://credentials.shimabell.dev`.

No separate Staging OAuth Client ID is required.
