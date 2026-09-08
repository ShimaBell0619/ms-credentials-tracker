# Microsoft Credentials Tracker

A date-led web application for reviewing Microsoft certification status, renewal windows, expiry dates, and planned certification events.

## Current state

The application now uses confirmed browser-local credential data for the main credential register and date projections. Static mock credential/schedule data is no longer the runtime source for the primary view.

A user can save the Microsoft Learn Transcript through `Print -> Save to PDF`, select that PDF in the import dialog, review parsed credential candidates, and explicitly confirm matched records into versioned browser-local storage. The PDF is parsed locally in the browser and is not uploaded to an application backend.

From confirmed credential facts plus the local `CredentialDefinition` policy, the application derives:

- active / renewal-available / expired / non-expiring status
- renewal opening date
- days until expiry
- next credential deadline
- credential-driven events in the next 90 days
- current-month calendar markers and upcoming events

Derived values are not persisted as application facts.

## Development

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Deployment

Production hosting uses Vercel with the repository connected through Vercel's Git integration.

- pushes to `main` create Production Deployments;
- feature branches and Pull Requests create Vercel Preview Deployments;
- Preview URLs are used for browser and smartphone UI review before merge;
- GitHub Actions remains responsible for repository quality gates, not hosting deployment.

Vercel detects the Vite application and its normal `npm run build` / `dist` output. The repository keeps only the `vercel.json` SPA fallback required so direct URL access and browser reloads are served through `index.html` instead of returning a hosting 404.

`VITE_GOOGLE_CLIENT_ID` is browser-visible OAuth client configuration, not a client secret. Configure it in the Vercel project for environments where Google Calendar synchronization should be enabled. See `docs/GOOGLE_CALENDAR.md` for the authorized-origin constraint that applies to Preview URLs.

## Transcript import boundary

The MVP import path is:

`Transcript PDF -> browser-local PDF.js text extraction -> parser -> ImportCandidate -> review -> confirm -> localStorage -> derived UI projections`

The prior shared-URL experiment established that direct browser retrieval is blocked by CORS and that a simple server-side GET receives an initial page shell without the browser-visible credential records. The application therefore does not rely on shared-page scraping, browser automation, or undocumented Microsoft Learn internal endpoints for the MVP.

## Current limitations

- planned-exam CRUD and schedule integration are not implemented yet
- passed exams and historical/expired Transcript credentials are detected but not yet persisted into application history
- manual credential add/edit/archive flows are not implemented yet
- image-only/scanned PDFs are not OCR'd
- the local credential catalog is intentionally incomplete; unknown imported credentials remain unresolved
- there is no Microsoft account authentication, server-side database, automatic synchronization, or notification integration

## Documentation language

Repository engineering and design documentation is written in English. User-facing UI copy remains Japanese unless the product language direction changes.
