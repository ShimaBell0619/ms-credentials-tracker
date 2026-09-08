# Microsoft Credentials Tracker

UI-only prototype for reviewing Microsoft certification status, renewal windows, expiry dates, and planned certification events.

## Experiment branch

`experiment/foundation-first-mock-ui` is a from-scratch comparison implementation for Issue #4. Its UI was designed from the untouched repository baseline using the latest Web App Foundation guidance; PR #2's UI is intentionally not used as a visual or structural source during implementation.

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

All displayed credential information is static mock data. No Microsoft account, API, authentication, or database integration is implemented.
