# Agent Instructions — Microsoft Credentials Tracker

Foundation-Version: 0.5.0
Foundation-Commit: a8c9098653446127e2610f4abaf44dd55ffe50a6

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
- Tailwind CSS is the styling baseline; use established shadcn/ui-style primitives for generic controls instead of rebuilding Button/Dialog/Input interaction behavior in application CSS.
- Keep `src/components/ui` generic. Product-specific appearance and meaning belong in semantic components such as `CredentialStatus`, `NextRenewal`, `RenewalTimeline`, and `CredentialRegister`.
- Do not copy shadcn/ui demo composition or treat Card/Badge as automatic page-building defaults. UI-library use and generic AI-template composition are separate concerns.
- Custom CSS is acceptable when it clearly improves a product-specific visualization such as the proportional 90-day timeline; do not use bespoke CSS as the default for standard controls.
- Material UI changes require rendered review around 1440px, 390px, and 320px.
- Check horizontal overflow, Japanese/CJK wrapping, keyboard focus, and state meaning without color-only dependence.
- Use render → critique → fix → re-render before completion.
- Import/reconciliation is a supporting workflow and must not displace the next-deadline-first hierarchy on the main schedule view.
- Manual credential add/edit/archive controls are not part of the current approved UI. Do not restore them without a new product decision.

## Domain logic

- Treat `CredentialDefinition`, user-earned credentials, credential history, exams/plans, and import candidates as separate concepts according to `docs/DOMAIN.md`.
- Store confirmed facts; derive status, renewal timing, remaining days, next action, and schedule projections.
- Microsoft-side data is input for assisted import/reconciliation and must not silently overwrite confirmed application data.
- Unknown imported credentials remain unresolved until explicitly mapped; do not invent identities from names or exam codes.
- Unit tests are required for independently testable domain logic.

## Transcript PDF import

- The approved MVP assisted-input path is a Microsoft Learn Transcript PDF saved by the user.
- Parse the selected PDF locally in the browser; do not upload the PDF to a backend in this milestone.
- Keep PDF extraction separate from Transcript normalization and catalog reconciliation.
- Treat PDF layout as external input rather than an API contract; parsing must be conservative and tested against representative layouts.
- Do not add OCR, browser automation, shared-page scraping, or undocumented Microsoft Learn endpoints without a new explicit decision.

## MVP persistence

- The current approved MVP source of truth is versioned browser-local storage after explicit user confirmation.
- Keep domain parsing/normalization independent from the browser-storage adapter so server-side persistence can replace it later.
- Do not introduce authentication, a server-side database/API, automatic synchronization, or other material architecture decisions without explicit approval.

## Review and completion

For every material change:

1. implement the approved scope;
2. self-review the final diff and behavior as if authored by another engineer;
3. correct valid defects or hardening gaps that do not require a new material decision;
4. re-review after corrections;
5. run the relevant final validation after the last material correction;
6. report the reviewed SHA/diff scope, validation evidence, independent-review decision, and remaining risk.

Self-review is mandatory and is not independent review, even when the implementation agent repeats the review from the same implementation context. Do not report a material change complete or merge it while silently carrying an unresolved Blocker/High or otherwise material finding.

## Independent review

Independent review is a separate, risk-based layer performed by a reviewer that did not own the implementation context.

- Low-risk changes may skip independent review when the PR records the reason.
- For authentication/authorization or trust-boundary changes; destructive/data-integrity risk; concurrency/race-sensitive behavior; compatibility/public-contract changes; CI/CD, release, deployment, rollback, or privileged workflow changes; or serious operational failure modes, obtain independent review before merge when practical.
- Request independent review against the intended merge-candidate HEAD after self-review and relevant CI succeed.
- Before every Codex review invocation, including re-review, present the user/maintainer with the concrete rationale, affected risk category, and expected review value, and obtain explicit approval. Do not invoke `@codex review` autonomously or reuse approval from an earlier invocation.
- Keep Codex Automatic Review / Review my pull requests OFF. After approval, request review manually from the PR conversation with `@codex review`.
- Reassess Codex findings against the Issue, repository contracts, diff, tests, and CI rather than accepting them mechanically.
- Do not rerun independent review after every correction. Consider it after Blocker/High fixes or material security, compatibility, CI/CD, deployment, or implementation-path changes. Every new Codex invocation still requires fresh approval.

## Code Review Rules

When acting as an independent reviewer, prioritize concrete high-impact defects over mechanical or stylistic findings.

- **Contract integrity** — compare the PR purpose, Issue/Acceptance Criteria, `PRODUCT.md`, `DESIGN.md`, `docs/DOMAIN.md`, diff, tests, and current behavior. Flag requirement mismatches and regressions.
- **Trust and delivery safety** — flag untrusted PR code executing with write credentials/secrets, release or deployment of a different revision than the validated SHA, OAuth/privacy-boundary mistakes, or quality-gate bypasses.
- **State and compatibility safety** — flag concrete local-storage migration/data-integrity failures, Google Calendar reconciliation/idempotency problems, concurrency/race/cleanup defects, destructive side effects, or backward-compatibility failures.

Do not fill review output with formatting, naming taste, style preference, or routine lint/type issues unless they materially contribute to correctness, security, compatibility, or operability risk.

## Engineering

- React + TypeScript + Vite + npm baseline.
- Pin reusable Foundation workflows to the recorded full commit SHA.
- `check`, `typecheck`, `test`, `build`, and browser-rendered E2E must pass once domain logic exists.
- Do not merge without explicit approval.
