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
    +--> optional explicit Fixed Staging selection
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
- **GitHub Actions Fixed Staging automation**: explicitly moves the mutable `staging` Git ref to a verified same-repository PR HEAD, and conditionally cleans it up after PR close;
- **Vercel**: Preview, Fixed Staging branch, and Production hosting through Git Integration.

The Staging workflows do not build or publish the application through the Vercel API. They only move the Git branch pointer; Vercel Git Integration remains the deployment owner.

## Production

The production branch is `main`.

The canonical application URL is:

`https://credentials.shimabell.dev`

The custom domain is configured on the Vercel project and backed by DNS for `shimabell.dev`.

The automatically assigned `*.vercel.app` URL is a platform deployment URL, not the canonical product address used in user-facing documentation or OAuth production configuration.

## Preview Deployments

Non-production branches and Pull Requests receive Vercel Preview Deployments.

Preview URLs are the standard review surface for:

- desktop and smartphone UI review;
- responsive layout checks;
- Transcript import behavior;
- credential projection behavior;
- direct URL access and reload behavior;
- other functionality that does not depend on an exact third-party OAuth origin.

A Preview Deployment is ephemeral and must not be treated as a stable production address.

Normal PR Preview behavior remains enabled even when a PR is also selected for Fixed Staging.

## Fixed Staging

`staging` is a one-PR verification slot for functionality that requires an exact stable Origin, such as Google OAuth. It is not a release branch and does not accumulate merged PR history.

The canonical Staging URL is:

`https://staging.credentials.shimabell.dev`

A maintainer explicitly runs **Deploy PR to Staging** from the Actions tab and supplies an open PR number. The workflow resolves that PR's current HEAD SHA and moves `staging` directly to the SHA. Only same-repository PRs targeting `main` are eligible; fork PRs are rejected.

When a PR closes or merges, cleanup resets `staging` to the current `main` HEAD only if `staging` still points to that closed PR's HEAD SHA. Ref updates use `git push --force-with-lease`, so a concurrent or newer Staging selection cannot be overwritten by a stale cleanup check.

Because `staging` is not the Production branch, Vercel treats it as a Preview deployment. Any build-time configuration needed by Staging must therefore be available to Preview for the `staging` branch.

See [STAGING.md](STAGING.md) for the complete operating, security, race-handling, and external-configuration contract.

## Vite build configuration

The repository relies on Vercel's normal Vite framework detection.

Do not override the build command or output directory unless the application actually needs behavior that Vercel cannot infer.

The normal application contract remains:

- build command: `npm run build`;
- build output: `dist`.

## SPA routing

`vercel.json` provides the SPA fallback that rewrites application paths to `index.html`.

This is required so a user can directly open or reload a client-side route without receiving a Vercel hosting 404.

Keep Vercel configuration minimal; do not move normal Vite behavior into `vercel.json` merely for explicitness.

## Configuration ownership

| Configuration | Owner / location |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` for Production | Vercel Project Environment Variables: Production |
| `VITE_GOOGLE_CLIENT_ID` for Fixed Staging | Vercel Project Environment Variables: Preview scoped to Git branch `staging` |
| `VITE_GOOGLE_CLIENT_ID` for local development | `.env.local` |
| Google OAuth Authorized JavaScript origins | Google Cloud OAuth Web Client |
| Production domain | Vercel Project domain configuration + DNS provider |
| Fixed Staging branch domain | Vercel Project domain configuration + DNS provider; Git branch `staging` |
| PR -> Staging slot selection / cleanup | GitHub Actions + Git ref `staging` |
| CI quality gates | GitHub Actions through the pinned `web-app-foundation` reusable workflow |
| Application credential facts | Versioned browser-local storage |
| Google Calendar ID / last sync metadata | Browser-local integration storage |

`VITE_GOOGLE_CLIENT_ID` is a browser-visible OAuth Client ID. It is not a client secret. Never put a Google OAuth client secret into this SPA.

Production and Fixed Staging intentionally use the same Google OAuth Web Client / Client ID. The same value must be configured in the two relevant Vercel environments; do not create a separate Staging OAuth client.

## Environment-variable changes

Vite embeds `VITE_*` variables into the frontend build. Changing `VITE_GOOGLE_CLIENT_ID` in Vercel does not modify an already-built deployment.

After changing the variable for an environment, create or redeploy a deployment for that environment so the new build receives the value.

For Production, verify the resulting build through `https://credentials.shimabell.dev`. For exact-Origin pre-production verification, explicitly select the PR for Fixed Staging and use `https://staging.credentials.shimabell.dev`.

## Google OAuth origins

The existing Google OAuth Web Client must preserve Production and add Fixed Staging as a second exact Authorized JavaScript origin:

```text
https://credentials.shimabell.dev
https://staging.credentials.shimabell.dev
```

Google OAuth Authorized JavaScript origins require exact origins and do not support a wildcard such as `https://*.vercel.app`.

Consequences:

- Production Calendar OAuth works through the canonical Production origin.
- Fixed Staging is the preferred review surface for PRs that require OAuth or another exact-Origin integration.
- Arbitrary Vercel PR Preview URLs remain available for non-OAuth review but are not registered with Google.
- Do not add a client secret, proxy, or weaker authorization model to bypass this limitation.

See [GOOGLE_CALENDAR.md](GOOGLE_CALENDAR.md) for the integration-specific contract and [STAGING.md](STAGING.md) for the Staging operating model.

## Quality gates

The consumer CI contract remains:

```bash
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The reusable workflow is pinned to the Foundation commit recorded in [FOUNDATION.md](FOUNDATION.md).

A successful Vercel deployment does not replace CI, and successful CI does not by itself prove that the Vercel Preview or Fixed Staging deployment is visually or externally correct. Both repository quality gates and the appropriate deployment-surface checks remain part of review.

## GitHub Pages status

GitHub Pages is no longer part of the active frontend deployment architecture.

Pages-specific candidate builds, privileged publication workflows, repository base-path builds, and Pages review publication should not be reintroduced unless hosting strategy is explicitly changed again.

## Operational verification after hosting changes

For changes that affect hosting or routing, verify at minimum:

1. GitHub CI succeeds.
2. The PR has a successful Vercel Preview Deployment.
3. The Preview opens on a smartphone-sized browser.
4. Direct navigation and browser reload do not return 404.
5. For Origin-dependent work, explicitly deploy the PR to Fixed Staging and verify `https://staging.credentials.shimabell.dev`.
6. After merge, the Production Deployment succeeds.
7. `https://credentials.shimabell.dev` serves the expected build.
8. Google Calendar OAuth is checked on Fixed Staging or Production when OAuth-related configuration changed.
