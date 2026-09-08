# Microsoft Credentials Tracker

A date-led personal web application for tracking Microsoft credential renewal windows, expiry dates, and the next action that needs attention.

**Production:** https://credentials.shimabell.dev

![Microsoft Credentials Tracker overview](docs/assets/readme-overview.gif)

> The README GIF is generated with Playwright from deterministic sample data. It is a documentation preview, not live Microsoft account data.

## What it does

- imports a Microsoft Learn Transcript PDF locally in the browser;
- lets the user review and confirm matched credentials before saving them;
- stores confirmed credential facts in versioned browser-local storage;
- derives active, renewal-available, expired, and non-expiring status from confirmed facts and local credential policy;
- projects the next credential deadline, a 90-day schedule, current-month markers, and upcoming events;
- explicitly synchronizes renewal and expiry events one-way to a dedicated Google Calendar.

Derived status and schedule values are not persisted as application facts.

## Architecture at a glance

```text
Microsoft Learn Transcript PDF
        |
        v
Browser-local PDF.js parsing
        |
        v
Import / review / confirmation
        |
        v
Versioned browser-local credential facts
        |
        +--> pure credential projections --> date-led UI
        |
        +--> explicit Google OAuth --> Google Calendar REST API
```

The current application is a React + TypeScript + Vite SPA hosted on Vercel. It has no application backend, server-side database, or Microsoft account authentication.

See [Architecture](docs/ARCHITECTURE.md) for the runtime and data boundaries.

## Development

Requirements:

- Node.js version from `.node-version`;
- npm;
- Chromium installed by Playwright when running browser tests.

```bash
npm ci
npm run dev
```

Optional local Google Calendar configuration:

```text
# .env.local
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` is public browser OAuth configuration, not a client secret. Do not commit `.env.local` or any Google client secret.

### Validation

```bash
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

### Regenerate the README GIF

The GIF is intentionally a simple top-to-bottom page overview. The script starts the local Vite app, injects deterministic sample credentials, marks the capture as demo data, and scrolls through the page with Playwright.

```bash
npx playwright install chromium
npm run docs:gif
```

`ffmpeg` must be available on `PATH` for GIF encoding. The generated file is `docs/assets/readme-overview.gif`.

## Deployment

Deployment uses the Vercel Git integration rather than a custom deployment workflow:

```text
feature branch -> Pull Request -> GitHub CI -> Vercel Preview -> review
                                                        |
                                                        v
                                                merge to main
                                                        |
                                                        v
                                             Vercel Production
                                                        |
                                                        v
                                      credentials.shimabell.dev
```

GitHub Actions remains responsible for quality gates. Vercel is responsible for Preview and Production hosting.

See [Deployment and operations](docs/DEPLOYMENT.md) for environment ownership, the custom domain, SPA routing, Preview behavior, and Google OAuth constraints.

## Documentation map

| Document | Responsibility |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | Product scope, primary task, and non-goals |
| [DESIGN.md](DESIGN.md) | UI hierarchy and visual design contract |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Implemented runtime architecture and trust/data-flow boundaries |
| [docs/DOMAIN.md](docs/DOMAIN.md) | Credential domain model, stored facts, derivation rules, and import boundary |
| [docs/GOOGLE_CALENDAR.md](docs/GOOGLE_CALENDAR.md) | Google authorization, synchronization ownership, reminders, and failure model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment, custom domain, environment configuration, and operations |
| [docs/FOUNDATION.md](docs/FOUNDATION.md) | Foundation provenance, reusable CI contract, and app-specific deviations |

## Current limitations

- planned-exam CRUD and schedule aggregation are not implemented yet;
- passed exams and historical/expired Transcript credentials are detected but are not yet persisted as application history;
- image-only or scanned PDFs are not OCR'd;
- the local credential catalog is intentionally incomplete, so unknown imported credentials remain unresolved;
- there is no Microsoft account authentication, application backend, server-side database, or automatic credential synchronization;
- Google Calendar synchronization is explicit and one-way; it does not run in the background.

Repository engineering and design documentation is written in English. User-facing UI copy remains Japanese unless the product language direction changes.
