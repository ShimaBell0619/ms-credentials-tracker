# Microsoft Credentials Tracker

A UI-first web application for reviewing Microsoft certification status, renewal windows, expiry dates, and planned certification events.

## Current state

The initial responsive UI baseline is implemented with static mock schedule data. The current import slice adds Microsoft Learn Transcript PDF ingestion without adding user authentication or a server-side credential database.

A user can save the Microsoft Learn Transcript through `Print -> Save to PDF`, select that PDF in the import dialog, review parsed credential candidates, and explicitly confirm matched records into versioned browser-local storage. The PDF is parsed locally in the browser and is not uploaded to an application backend.

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

## Transcript import boundary

The MVP import path is:

`Transcript PDF -> browser-local PDF.js text extraction -> parser -> ImportCandidate -> review -> confirm -> localStorage`

The prior shared-URL experiment established that direct browser retrieval is blocked by CORS and that a simple server-side GET receives an initial page shell without the browser-visible credential records. The application therefore does not rely on shared-page scraping, browser automation, or undocumented Microsoft Learn internal endpoints for this milestone.

## Current limitations

- the main schedule/register remains static mock data and does not yet project imported records
- image-only/scanned PDFs are not OCR'd
- the local credential catalog is intentionally incomplete; unknown imported credentials remain unresolved
- there is no Microsoft account authentication, server-side database, automatic synchronization, real renewal calculation, or notification integration

## Documentation language

Repository engineering and design documentation is written in English. User-facing UI copy remains Japanese unless the product language direction changes.
