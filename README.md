# Microsoft Credentials Tracker

A UI-first web application for reviewing Microsoft certification status, renewal windows, expiry dates, and planned certification events.

## Current state

The initial responsive UI baseline is implemented with static mock data. A Microsoft Learn Transcript share URL can be sent to the dedicated Azure Function, normalized through the current public Transcript JSON representation, parsed into import candidates, explicitly confirmed, and persisted in versioned browser-local storage.

The main schedule/register still uses mock data; imported records do not drive those projections yet.

## Development

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` when testing the shared-Transcript flow against the deployed Function. The endpoint is injected at build time with `VITE_TRANSCRIPT_API_URL`; the share URL itself is sent in a POST body and is never stored by the application.

Validation:

```bash
npm run check
npm run typecheck
npm run test
npm run build:function
npm run build
npm run test:e2e
```

Azure infrastructure, OIDC bootstrap, deployment, and the Transcript transport security boundary are documented in `docs/AZURE.md`. Credential-domain and import/reconciliation rules are documented in `docs/DOMAIN.md`.

## Current limitations

- The main schedule and credential register remain static mock data.
- Imported records are browser-local and intentionally do not drive those projections yet.
- There is no Microsoft account authentication, server-side database, automatic synchronization, real renewal calculation, or notification integration.
- The current Microsoft Learn Transcript JSON endpoint is an undocumented implementation detail. It is suitable as a best-effort personal-MVP input adapter but may change without notice; confirmed application data must not depend on it remaining available.

## Documentation language

Repository engineering and design documentation is written in English. User-facing UI copy remains Japanese unless the product language direction changes.
