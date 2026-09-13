# Deployment and operations

This document describes the active Vercel deployment and hosted-review model.

## Deployment flow

```text
feature / fix branch
    |
    +--> GitHub Actions CI / E2E
    |
    +--> no automatic Vercel deployment
    |
    +--> optional `/preview` comment
    |       |
    |       +--> exact PR HEAD CI
    |       +--> trusted synthetic `preview/pr-N`
    |       +--> Vercel Preview
    |       +--> real generated URL returned to the PR
    |
    +--> optional Fixed Staging request when exact Origin is required
            |
            +--> exact PR HEAD CI
            +--> trusted synthetic `staging` source
            +--> https://staging.credentials.shimabell.dev

merge to main
    |
    +--> GitHub Actions CI / E2E
    +--> Vercel Production
            |
            +--> https://credentials.shimabell.dev
```

GitHub Actions owns quality validation and trusted source selection. Vercel Git Integration remains the deployment provider. The workflows do not call the Vercel deployment API and do not use a Vercel API token or Deploy Hook.

## Vercel branch policy

`vercel.json` fails closed for ordinary Git branches:

- `"**": false` suppresses ordinary branches, including slash-containing feature/fix branch names;
- `main` is explicitly enabled for Production;
- `preview/**` is explicitly enabled only for trusted On-demand Preview synthetic refs;
- `staging` is explicitly enabled for the stable OAuth verification slot.

## Production

The Production branch is `main` and the canonical URL is `https://credentials.shimabell.dev`.

The automatically assigned Vercel deployment URL is platform metadata, not the canonical product address used in user-facing documentation or Google OAuth Production configuration.

## On-demand Preview

On-demand Preview is the normal hosted browser review path. Ordinary PR branches do not receive Vercel deployments merely because they are pushed.

An eligible repository writer requests Preview by commenting exactly `/preview` on an open same-repository PR targeting `main`. Trusted automation validates the exact PR HEAD with the pinned Foundation Web CI, then creates a content-identical synthetic `preview/pr-N` child commit. Vercel deploys that trusted ref and emits `vercel.deployment.success`; after validating the project, ref, SHA, current PR, parent/tree identity, and ownership markers, GitHub Actions posts the actual generated `*.vercel.app` application URL to the PR.

Use this path for normal UI, responsive layout, Transcript import, credential projection, direct URL/reload behavior, and other checks that do not require a pre-registered third-party Origin.

## Fixed Staging

`staging` remains a one-PR fixed-origin verification slot for functionality such as Google OAuth. It is not a release or integration-history branch.

The canonical Staging URL remains `https://staging.credentials.shimabell.dev`.

A maintainer explicitly runs **Request PR for Fixed Staging** from `main` and supplies an open same-repository PR targeting `main`. The request workflow is read-only. The trusted `workflow_run` publisher resolves exact PR HEAD A, runs the pinned Foundation Web CI against A, revalidates A, creates a content-identical synthetic child B with explicit ownership markers, and moves `staging` to B using force-with-lease.

Publisher and cleanup runs share serialized `fixed-staging-deploy-slot` concurrency. Newer requests supersede older requests. Closing the owning PR resets `staging` to current `main` only if the current Staging synthetic commit still carries that PR's ownership marker; cleanup cannot overwrite a newer occupant.

Because `staging` is a Vercel Preview branch, build-time values required there must remain available to the Preview environment scoped to Git branch `staging`.

See [STAGING.md](STAGING.md) for the operating and trust contract.

## Vite build configuration

Vercel uses the normal Vite build contract: `npm run build` -> `dist`.

`vercel.json` preserves the SPA fallback required for direct navigation/reload of client-side routes.

## Configuration ownership

| Configuration | Owner / location |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` for Production | Vercel Project Environment Variables: Production |
| `VITE_GOOGLE_CLIENT_ID` for Fixed Staging | Vercel Project Environment Variables: Preview scoped to Git branch `staging` |
| `VITE_GOOGLE_CLIENT_ID` for local development | `.env.local` |
| Google OAuth Authorized JavaScript origins | Google Cloud OAuth Web Client |
| Production domain | Vercel Project domain configuration + DNS provider |
| Fixed Staging branch domain | Vercel Project domain configuration + DNS provider; Git branch `staging` |
| On-demand Preview selection / feedback / cleanup | GitHub Actions + synthetic `preview/pr-N` refs + Vercel Git Integration |
| Fixed Staging request / publish / cleanup | GitHub Actions + synthetic `staging` source + Vercel Git Integration |
| CI quality gates | GitHub Actions through the pinned `web-app-foundation` reusable workflow |
| Application credential facts | Versioned browser-local storage |
| Google Calendar ID / last sync metadata | Browser-local integration storage |

`VITE_GOOGLE_CLIENT_ID` is browser-visible public OAuth client configuration, not a client secret. Production and Fixed Staging intentionally use the same OAuth Web Client / Client ID.

## Google OAuth origins

The OAuth Web Client preserves these exact authorized origins:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

Generated On-demand Preview URLs are intentionally not registered. OAuth/exact-Origin verification uses Fixed Staging; normal hosted review uses `/preview`.

## Quality gates

The consumer validation contract remains:

```bash
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

A successful Vercel deployment does not replace CI, and successful CI alone does not prove the provider surface or OAuth integration.

## Operational verification after delivery changes

1. PR CI/E2E succeeds.
2. Ordinary PR/feature branch push does not create a Vercel deployment.
3. When hosted review is needed, `/preview` returns a validated real Vercel application URL.
4. When exact-Origin behavior is involved, request Fixed Staging and verify `https://staging.credentials.shimabell.dev`.
5. After merge, main CI/E2E and Production deployment succeed at `https://credentials.shimabell.dev`.
6. Google Calendar OAuth is checked on Fixed Staging or Production when relevant configuration changes.

GitHub Pages remains retired.
