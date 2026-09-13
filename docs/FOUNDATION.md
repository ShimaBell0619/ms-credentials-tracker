# Foundation provenance

- Adopted Foundation version: 0.10.0
- Foundation commit: `007352e15fcc6f9620686d3b77e11e85341eac02`
- Reusable workflow commit: `007352e15fcc6f9620686d3b77e11e85341eac02`
- Adopted on: 2026-09-13

## v0.10.0 adoption impact

Foundation v0.10.0 changes the normal Vercel hosted-review path from automatic per-PR deployment to explicit On-demand Preview while retaining Fixed Staging as an optional stable-origin profile.

This application adopts both profiles:

- ordinary feature/fix/PR branches are deployment-disabled;
- an eligible repository writer comments `/preview` to request normal hosted review;
- `preview/pr-N` is the only trusted synthetic Preview source used for generated Vercel Preview URLs;
- `staging` remains the fixed-origin verification slot for Google OAuth and other exact-Origin checks;
- `main` remains Production.

The repository-owned Vercel policy uses slash-safe `"**": false` and explicitly enables only `main`, `preview/**`, and `staging`.

## On-demand Preview

The copied v0.10.0 workflow/helper follows the released trust contract:

1. `/preview` must be an exact comment by a repository writer on an open same-repository PR targeting `main`.
2. The exact PR HEAD A is validated with the reusable Foundation Web CI pinned to the recorded release SHA, including this application's E2E contract.
3. Trusted default-branch automation revalidates the PR and creates a synthetic child B where `parent(B)=A`, `tree(B)=tree(A)`, and the diff is empty.
4. Vercel Git Integration deploys `preview/pr-N`.
5. A `vercel.deployment.success` repository-dispatch event is accepted only after project/ref/SHA/PR/provenance validation; the real generated `*.vercel.app` application URL is then posted to the PR.
6. Closing the PR removes only the matching Foundation-owned synthetic Preview branch using force-with-lease protection.

No Vercel API token or Deploy Hook is introduced. Generated Preview origins are not registered with Google OAuth and are therefore not the verification surface for exact-Origin OAuth behavior.

## Fixed Staging

Fixed Staging remains required by this application because Google OAuth authorizes the stable origin `https://staging.credentials.shimabell.dev`.

The four copied Fixed Staging assets are aligned to the v0.10.0 hardened contract. The existing request workflow already matched the released template byte-for-byte and therefore required no source change; the publisher, cleanup workflow, and helper were upgraded together.

The hardened flow:

- resolves the requested open same-repository PR and exact HEAD A from the read-only request artifact;
- runs the pinned Foundation Web CI against A before mutation;
- creates a content-identical synthetic child B carrying explicit `Foundation-Fixed-Staging-PR` and `Source-PR-HEAD` ownership markers;
- moves `staging` to B with force-with-lease and serialized `fixed-staging-deploy-slot` concurrency;
- revalidates PR state/HEAD immediately before mutation and rejects superseded requests;
- resets `staging` to current `main` on PR close only when the current synthetic commit still carries the closing PR's ownership marker.

The app-specific configuration-location deviation is preserved: the canonical Staging URL remains directly owned by this app's publisher as `https://staging.credentials.shimabell.dev`; a `FIXED_STAGING_URL` repository variable is not introduced solely for Foundation conformity.

## Application-specific boundaries

- Production remains `https://credentials.shimabell.dev`.
- Fixed Staging remains `https://staging.credentials.shimabell.dev`.
- Production and Fixed Staging intentionally use the same browser-visible Google OAuth Client ID but remain separate browser origins.
- Browser-local credential data and Google Calendar metadata remain origin-local; this adoption changes no product data model or persistence behavior.
- GitHub Pages remains retired.
- Vercel Git Integration remains the deployment provider; GitHub Actions selects trusted source refs and performs quality validation but does not call the Vercel deployment API.
- Application GitHub Release semantics are unchanged.

## Validation requirement

The adoption is complete only after post-merge evidence proves all active paths:

1. an ordinary slash-containing branch receives no Vercel deployment/status;
2. `/preview` validates exact source and returns the real generated Preview URL;
3. Fixed Staging deploys the validated source through the stable staging origin and preserves ownership/cleanup semantics;
4. `main` continues to deploy successfully to Production;
5. normal CI/E2E succeeds on the merge candidate and final `main` SHA.

Copied Foundation rules/templates do not update automatically. Future upgrades must review the released Foundation diff, preserve application-specific product/design/OAuth decisions, and update copied contracts deliberately.
