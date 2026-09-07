# Microsoft Credentials Tracker — Agent Instructions

Foundation-Version: 0.2.0

## Read order

Before changing code, read `PRODUCT.md`, `DESIGN.md`, this file, `README.md`, then relevant `docs/*`.

## Foundation contract

This repository adopts `ShimaBell0619/web-app-foundation` v0.2.0. Preserve its engineering intent unless an app-specific document explicitly records a deviation.

- Work from an Issue and a short-lived branch created from the current base SHA.
- Keep product behavior in `PRODUCT.md` and UI/UX decisions in `DESIGN.md`.
- Use React + TypeScript + Vite + npm unless approved requirements justify a different architecture.
- Prefer semantic HTML, accessible native behavior, visible focus, and responsive layout by available width.
- Keep domain/business logic independent from UI state when real logic is introduced.
- Do not add dependencies without a concrete need; pin direct dependencies and commit the lockfile.
- Pin external GitHub Actions and Foundation reusable workflows to full reviewed commit SHAs.
- Never commit credentials, tokens, private keys, or generated secrets.

## Validation contract

Material changes require implement → self-review → correct/harden → re-review → final validation.

Default CI gates are reproducible `npm ci`, `npm run check`, `npm run typecheck`, and `npm run build`. Tests may be explicitly opted out only with a reason. User-facing UI changes require rendered browser validation; source inspection alone is insufficient.

## Approval boundary

Do not introduce authentication, authorization, persistence, external data transmission, recurring-cost services, deployment/provider choices, or other material architecture/trust-boundary changes without explicit approval.

Do not merge a PR until the user explicitly approves the merge.

## Current mock-specific constraint

Issue #1 is presentation-only. Static sample data may be used to express the intended information hierarchy, but it must remain clearly marked as mock data and must not be treated as evidence that any real Microsoft data source or renewal calculation has been implemented.
