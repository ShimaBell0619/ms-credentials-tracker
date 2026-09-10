# Deployment and operations

This document describes the active deployment and configuration model after the move from GitHub Pages to Vercel.

## Deployment flow

Vercel is connected directly to the GitHub repository. Hosting deployment is not implemented as a custom GitHub Actions publisher.

```text
feature branch
    |
    v
Pull Request
    |
    +--> GitHub Actions CI
    |
    +--> Vercel Preview Deployment (*.vercel.app)
    |
    +--> optional read-only Fixed Staging request
    |         |
    |         v
    |      trusted workflow_run publisher
    |         |
    |         v
    |      staging branch -> Vercel Branch Deployment
    |                         |
    |                         v
    |              https://staging.credentials.shimabell.dev
    |
    v
merge to main
    |
    v
Vercel Production Deployment
    |
    v
https://credentials.shimabell.dev
```

GitHub Actions and Vercel have separate responsibilities:

- **GitHub Actions CI**: repository quality gates;
- **Fixed Staging request**: manual, read-only PR selection request;
- **Fixed Staging publisher/cleanup**: trusted default-branch ref selection and conditional cleanup;
- **Vercel**: Preview, Fixed Staging branch, and Production hosting through Git Integration.

The Staging workflows do not build or publish through the Vercel API. They only move the Git branch pointer; Vercel Git Integration remains the deployment owner.

## Production

The production branch is `main` and the canonical URL is `https://credentials.shimabell.dev`.

The automatically assigned `*.vercel.app` URL is a platform deployment URL, not the canonical product address used in user-facing documentation or OAuth Production configuration.

## Preview Deployments

Non-production branches and Pull Requests receive Vercel Preview Deployments. They remain the standard review surface for UI, responsive layout, Transcript import, credential projection, direct URL/reload behavior, and other functionality that does not depend on an exact third-party OAuth origin.

Normal PR Preview remains enabled even when a PR is also selected for Fixed Staging.

## Fixed Staging

`staging` is a one-PR verification slot for functionality that requires an exact stable Origin, such as Google OAuth. It is not a release branch and does not accumulate merged PR history.

The canonical Staging URL is `https://staging.credentials.shimabell.dev`.

A maintainer explicitly runs **Request PR for Fixed Staging** from `main` and supplies an open PR number. That manual workflow is read-only. A separate write-enabled `workflow_run` publisher, executing from the trusted default-branch context, validates the request and current PR HEAD before moving `staging` directly to the SHA. Only same-repository PRs targeting `main` are eligible; fork PRs are rejected.

Publisher runs retain queued requests with `concurrency.queue: max`; newer eligible manual requests supersede older ones. Ref updates use `git push --force-with-lease` so stale operations cannot overwrite a newer Staging selection.

When a PR closes or merges, trusted cleanup resets `staging` to current `main` only if `staging` still points to that closed PR HEAD. Cleanup does not depend on the PR's current base branch, preventing a retargeted staged PR from stranding the slot.

Because `staging` is not the Production branch, Vercel treats it as a Preview deployment. Any build-time configuration needed by Staging must therefore be available to Preview for Git branch `staging`.

See [STAGING.md](STAGING.md) for the complete operating and security contract.

## Vite build configuration

The repository relies on Vercel's normal Vite framework detection. The normal application contract remains `npm run build` -> `dist`.

`vercel.json` provides the SPA fallback required for direct navigation/reload of client-side routes.

## Configuration ownership

| Configuration | Owner / location |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` for Production | Vercel Project Environment Variables: Production |
| `VITE_GOOGLE_CLIENT_ID` for Fixed Staging | Vercel Project Environment Variables: Preview scoped to Git branch `staging` |
| `VITE_GOOGLE_CLIENT_ID` for local development | `.env.local` |
| Google OAuth Authorized JavaScript origins | Google Cloud OAuth Web Client |
| Production domain | Vercel Project domain configuration + DNS provider |
| Fixed Staging branch domain | Vercel Project domain configuration + DNS provider; Git branch `staging` |
| PR -> Staging request / ref publisher / cleanup | GitHub Actions + Git ref `staging` |
| CI quality gates | GitHub Actions through the pinned `web-app-foundation` reusable workflow |
| Application credential facts | Versioned browser-local storage |
| Google Calendar ID / last sync metadata | Browser-local integration storage |

`VITE_GOOGLE_CLIENT_ID` is browser-visible public OAuth client configuration, not a client secret. Production and Fixed Staging intentionally use the same OAuth Web Client / Client ID.

## Environment-variable changes

Vite embeds `VITE_*` variables into the frontend build. After changing an environment value, redeploy that environment so the new build receives it.

## Google OAuth origins

The OAuth Web Client preserves both exact origins:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

Production Calendar OAuth uses Production; Fixed Staging is the pre-production surface for OAuth/exact-Origin work; arbitrary Vercel PR Preview URLs remain available for non-OAuth review.

See [GOOGLE_CALENDAR.md](GOOGLE_CALENDAR.md) and [STAGING.md](STAGING.md).

## Quality gates

The consumer CI contract remains:

```bash
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

A successful Vercel deployment does not replace CI, and successful CI does not by itself prove the deployment surface or external integration is correct.

## GitHub Pages status

GitHub Pages is no longer part of the active frontend deployment architecture.

## Operational verification after hosting changes

1. GitHub CI succeeds.
2. The PR has a successful ordinary Vercel Preview.
3. Smartphone-sized rendering and direct reload work.
4. For Origin-dependent work, request the PR for Fixed Staging and verify `https://staging.credentials.shimabell.dev`.
5. After merge, Production deployment succeeds at `https://credentials.shimabell.dev`.
6. Google Calendar OAuth is checked on Fixed Staging or Production when relevant configuration changes.
