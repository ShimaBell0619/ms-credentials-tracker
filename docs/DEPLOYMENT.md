# Deployment and operations

This document describes the active deployment and configuration model after the move from GitHub Pages to Vercel.

## Deployment flow

Vercel is connected directly to the GitHub repository. Deployment is not implemented as a custom GitHub Actions workflow.

```text
feature branch
    |
    v
Pull Request
    |
    +--> GitHub Actions CI
    |
    +--> Vercel Preview Deployment
              |
              v
       browser / smartphone review
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

- **GitHub Actions**: repository quality gates;
- **Vercel**: Preview and Production hosting.

Do not add another GitHub Actions deployment path while the Vercel Git integration provides the required behavior.

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
| `VITE_GOOGLE_CLIENT_ID` for deployed builds | Vercel Project Environment Variables |
| `VITE_GOOGLE_CLIENT_ID` for local development | `.env.local` |
| Google OAuth Authorized JavaScript origins | Google Cloud OAuth Web Client |
| Production domain | Vercel Project domain configuration + DNS provider |
| CI quality gates | GitHub Actions through the pinned `web-app-foundation` reusable workflow |
| Application credential facts | Versioned browser-local storage |
| Google Calendar ID / last sync metadata | Browser-local integration storage |

`VITE_GOOGLE_CLIENT_ID` is a browser-visible OAuth Client ID. It is not a client secret. Never put a Google OAuth client secret into this SPA.

## Environment-variable changes

Vite embeds `VITE_*` variables into the frontend build. Changing `VITE_GOOGLE_CLIENT_ID` in Vercel does not modify an already-built deployment.

After changing the variable for an environment, create or redeploy a deployment for that environment so the new build receives the value.

For Production, verify the resulting build through `https://credentials.shimabell.dev`.

## Google OAuth origins

Production Google Calendar authorization should use the canonical production origin:

`https://credentials.shimabell.dev`

Google OAuth Authorized JavaScript origins require exact origins and do not support a wildcard such as `https://*.vercel.app`.

Consequences:

- Production Calendar OAuth works after the canonical origin is registered in Google Cloud.
- Arbitrary Vercel Preview URLs are not automatically authorized for Google OAuth.
- A specific Preview can be tested with OAuth only if its exact origin is deliberately added to the OAuth client.
- Do not add a client secret, proxy, or weaker authorization model to bypass this limitation.

See [GOOGLE_CALENDAR.md](GOOGLE_CALENDAR.md) for the integration-specific contract.

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

A successful Vercel deployment does not replace CI, and successful CI does not by itself prove that the Vercel Preview is visually correct. Both checks are part of the PR workflow.

## GitHub Pages status

GitHub Pages is no longer part of the active frontend deployment architecture.

Pages-specific candidate builds, privileged publication workflows, repository base-path builds, and Pages review publication should not be reintroduced unless hosting strategy is explicitly changed again.

## Operational verification after hosting changes

For changes that affect hosting or routing, verify at minimum:

1. GitHub CI succeeds.
2. The PR has a successful Vercel Preview Deployment.
3. The Preview opens on a smartphone-sized browser.
4. Direct navigation and browser reload do not return 404.
5. After merge, the Production Deployment succeeds.
6. `https://credentials.shimabell.dev` serves the expected build.
7. Google Calendar OAuth is checked on Production when OAuth-related configuration changed.
