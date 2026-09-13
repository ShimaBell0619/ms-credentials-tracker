# Fixed Staging slot

This repository uses three distinct hosted surfaces, but only two are persistent origins:

| Surface | Git source | URL | Purpose |
| --- | --- | --- | --- |
| On-demand Preview | synthetic `preview/pr-N` | generated `*.vercel.app` URL returned to the PR | normal hosted browser review after explicit `/preview` |
| Fixed Staging | synthetic source on mutable `staging` branch | `https://staging.credentials.shimabell.dev` | Google OAuth and other exact-Origin verification |
| Production | `main` | `https://credentials.shimabell.dev` | released application |

Ordinary feature/fix/PR branches do not deploy to Vercel. Fixed Staging is not the normal hosted-review path; it exists because OAuth requires a pre-registered stable Origin.

`staging` is a single mutable verification slot, not a release or integration-history branch.

## Normal hosted review

For review that does not require the fixed OAuth Origin, an eligible repository writer comments exactly `/preview` on the PR. The On-demand Preview workflow validates the exact current PR HEAD before publishing a content-identical synthetic `preview/pr-N` source and returns the real generated Vercel application URL to the PR.

Generated Preview URLs are not added to Google OAuth Authorized JavaScript origins.

## Request a PR for Fixed Staging

1. Open **Actions**.
2. Select **Request PR for Fixed Staging**.
3. Run it from `main` and enter the open PR number.
4. The read-only request workflow stores bounded request metadata only.
5. The trusted **Publish Fixed Staging** workflow resolves the exact current PR HEAD A and validates A with the pinned Foundation Web CI.
6. After revalidation, trusted automation creates a content-identical synthetic child B carrying explicit PR/source ownership markers and moves `staging` to B using force-with-lease.
7. Vercel Git Integration deploys `https://staging.credentials.shimabell.dev`.

Only open same-repository PRs targeting `main` are eligible. Fork PRs are rejected. If the PR HEAD changes, request Fixed Staging again.

## Privilege and source-identity boundary

The manual request workflow is read-only and does not execute PR code with write credentials. The write-enabled publisher runs from trusted `main` through `workflow_run` and independently validates request provenance, PR eligibility, and exact source SHA.

The requested PR code is validated in a separate read-only reusable CI job. Only after that exact source passes CI does the publisher create the content-identical synthetic child used by Vercel. The synthetic commit must have the validated source as its sole parent, the exact same tree, an empty diff, and explicit `Foundation-Fixed-Staging-PR` / `Source-PR-HEAD` markers.

Selected PR code later executes in Vercel's Staging Preview environment. Do not expose Production secrets to Staging PR code.

## Ordering and race behavior

Publisher and cleanup operations are serialized with the `fixed-staging-deploy-slot` concurrency group and queue rather than cancelling in-flight mutation.

A newer eligible manual request supersedes an older one. The publisher checks for superseding requests before mutation and revalidates PR HEAD immediately before moving the ref.

Every `staging` mutation uses force-with-lease against the observed ref SHA. Stale publishers and cleanup jobs therefore cannot blindly overwrite a newer occupant.

## Cleanup

`Cleanup Fixed Staging` uses trusted `pull_request_target: closed` automation and never executes PR code.

Cleanup reads the current `staging` synthetic commit and resets the slot to current `main` only when its ownership marker matches the PR being closed. A stale close event cannot clear a newer occupant. If the slot has already moved or been reset, cleanup skips.

## Vercel and OAuth configuration

The stable mapping remains:

```text
main    -> https://credentials.shimabell.dev
staging -> https://staging.credentials.shimabell.dev
```

`staging` is a Vercel Preview branch even though it has a stable Branch Domain. `VITE_GOOGLE_CLIENT_ID` therefore remains configured for Preview scoped to Git branch `staging`, using the same browser-visible public Client ID as Production.

The OAuth Web Client keeps exactly these registered application origins:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

On-demand Preview URLs remain unregistered and are not used for Google OAuth verification.

The canonical Staging URL remains app-owned directly in the publisher workflow; this repository intentionally does not add `FIXED_STAGING_URL` solely to mirror the optional Foundation default configuration location.

## Browser-origin state

Production, Fixed Staging, and each generated Preview URL are different browser origins. Their `localStorage`, cookies, IndexedDB, and similar state are not shared. Remote integration resources that must be reused across origins need explicit reconciliation rather than relying only on an origin-local identifier.
