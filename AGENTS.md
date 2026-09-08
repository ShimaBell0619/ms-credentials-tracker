# Agent Instructions — Microsoft Credentials Tracker

Foundation-Version: 0.3.1
Foundation-Commit: 5382fc2c0735ce82c54dd05c07cb369d4b3b536a

## Read order

1. `PRODUCT.md`
2. `DESIGN.md`
3. `AGENTS.md`
4. relevant Issue / PR
5. Foundation specialist guidance when needed

## Current baseline

PR #5 is the selected initial UI baseline after comparing independent mock implementations. PR #2 is superseded and should not be used as the implementation source for follow-up work.

Preserve the date-led information hierarchy defined in `DESIGN.md` unless a later approved product/design decision explicitly changes it.

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

## Domain logic

- Introduce domain logic in follow-up Issues/PRs rather than expanding the UI-baseline PR.
- Define the credential domain model and application source of truth before adding authentication or Microsoft integrations.
- Once independently testable domain logic is introduced, enable unit tests and remove the current UI-only unit-test opt-out.
- Do not introduce authentication, persistence, external APIs, or other material architecture decisions without the required explicit approval.

## Engineering

- React + TypeScript + Vite + npm baseline.
- Pin reusable Foundation workflows to the recorded full commit SHA.
- `check`, `typecheck`, `build`, and browser-rendered E2E must pass.
- The UI-only baseline may keep unit tests opted out only while there is no independently testable domain logic; record the reason in CI.
- Do not merge without explicit approval.
