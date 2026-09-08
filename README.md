# Microsoft Credentials Tracker

A UI-first web application for reviewing Microsoft certification status, renewal windows, expiry dates, and planned certification events.

## Current state

The initial responsive UI baseline is implemented with static mock data. It is intentionally designed around the next required credential action rather than a generic KPI dashboard.

The next development phase should introduce domain logic incrementally, starting with the credential data model and application source-of-truth design before authentication, persistence, or Microsoft integrations.

## Development

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check
npm run typecheck
npm run build
npm run test:e2e
```

## Current limitations

All displayed credential information is static mock data. No Microsoft account, API, authentication, persistence, real renewal calculation, or notification integration is implemented yet.

## Documentation language

Repository engineering and design documentation is written in English. User-facing UI copy remains Japanese unless the product language direction changes.
