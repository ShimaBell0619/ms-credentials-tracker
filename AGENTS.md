# Agent Instructions — Microsoft Credentials Tracker

Foundation-Version: 0.3.1
Foundation-Commit: 5382fc2c0735ce82c54dd05c07cb369d4b3b536a

## Read order

1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/DOMAIN.md`
4. `AGENTS.md`
5. relevant Issue / PR
6. Foundation specialist guidance when needed

## Current baseline

PR #5 is the selected initial UI baseline after comparing independent mock implementations. PR #2 is superseded and should not be used as the implementation source for follow-up work.

Preserve the date-led information hierarchy defined in `DESIGN.md` unless a later approved product/design decision explicitly changes it.

The approved credential-domain and MVP data-boundary decisions are recorded in `docs/DOMAIN.md`. Do not recreate domain entities from the original UI-only `mock-data.ts` shape.

## Documentation language

- Write repository engineering, architecture, product-design, Issue, and PR technical documentation in English by default.
- Japanese is appropriate when quoting or specifying user-facing UI copy, locale-specific behavior, or Japanese/CJK rendering requirements.
- User-facing application copy remains Japanese unless the product language direction is explicitly changed.

## UI implementation

- Static or test data must never be presented as live Microsoft account data.
- Follow the product-specific design direction in `DESIGN.md`; do not fill gaps with generic dashboard defaults.
- Material UI changes require rendered review around 1440px, 390px, and 320px.
- Check horizontal overflow, Japanese/CJK wrapping, keyboard focus, and state meaning without color-only dependence.
- Use render → critique → fix → re-render before completion.
- Import/reconciliation is a supporting workflow and must not displace the next-deadline-first hierarchy on the main schedule view.

## Domain logic

- Treat `CredentialDefinition`, user-earned credentials, credential history, exams/plans, and import candidates as separate concepts according to `docs/DOMAIN.md`.
- Store confirmed facts; derive status, renewal timing, remaining days, next action, and schedule projections.
- Microsoft-side data is input for assisted import/reconciliation and must not silently overwrite confirmed application data.
- Unknown imported credentials remain unresolved until explicitly mapped; do not invent identities from names or exam codes.
- Unit tests are required for independently testable domain logic.

## MVP persistence

- The current approved MVP source of truth is versioned browser-local storage after explicit user confirmation.
- Keep domain parsing/normalization independent from the browser-storage adapter so server-side persistence can replace it later.
- Do not introduce authentication, a server-side database/API, automatic synchronization, or other material architecture decisions without explicit approval.

## Engineering

- React + TypeScript + Vite + npm baseline.
- Pin reusable Foundation workflows to the recorded full commit SHA.
- `check`, `typecheck`, `test`, `build`, and browser-rendered E2E must pass once domain logic exists.
- Do not merge without explicit approval.
