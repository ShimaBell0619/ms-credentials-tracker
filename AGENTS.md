# Agent Instructions — Microsoft Credentials Tracker

Foundation-Version: 0.3.1
Foundation-Commit: 5382fc2c0735ce82c54dd05c07cb369d4b3b536a

## Read order

1. `PRODUCT.md`
2. `DESIGN.md`
3. `AGENTS.md`
4. relevant Issue / PR
5. Foundation specialist guidance when needed

## Current experiment

Issue #4 is an independent from-scratch UI experiment. Until its implementation and validation are complete, do not inspect or copy PR #2's UI implementation, CSS, component structure, screenshots, or design rationale. Infrastructure-only package/lockfile reuse is allowed.

## UI implementation

- Preserve the UI-only scope; do not add authentication, APIs, persistence, or fake working actions.
- Static mock data belongs in `src/mock-data.ts` and must not be presented as live account data.
- Follow the product-specific design direction in `DESIGN.md`; do not fill gaps with generic dashboard defaults.
- Material UI changes require rendered review around 1440px, 390px, and 320px.
- Check horizontal overflow, Japanese/CJK wrapping, keyboard focus, and state meaning without color-only dependence.
- Use render → critique → fix → re-render before completion.

## Engineering

- React + TypeScript + Vite + npm baseline.
- Pin reusable Foundation workflows to the recorded full commit SHA.
- `check`, `typecheck`, `build`, and browser-rendered E2E must pass.
- Unit tests may be opted out while the milestone contains no independently testable domain logic; record the reason in CI.
- Do not merge without explicit approval.
