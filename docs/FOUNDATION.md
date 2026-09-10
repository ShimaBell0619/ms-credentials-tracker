# Foundation provenance

- Adopted Foundation version: 0.7.2
- Foundation commit: `976421d0a88e059e60cfb71b86542d27640ae151`
- Reusable workflow commit: `c968b8af1f666d8f6024cd9e292c91cbf631fefe`
- Adopted on: 2026-09-11

The reusable Web CI pin intentionally remains on the reviewed v0.7.0 commit because Foundation v0.7.2 does not change the reusable Web CI contract. v0.7.2 hardens the copied Fixed Staging publisher and release-preparation discipline, so those changes are adopted deliberately without moving an unrelated workflow SHA solely for version conformity.

## Adopted AI implementation profile

- Normal Chat-based material changes use the v0.7.2 context-routed implementation profile.
- `AGENTS.md` owns the repository-specific Context Routing index; matching routes are additive and point to the actual normative specialist documents in this repository.
- Repository contracts remain the source of truth. The Repository Context Packet is session-local working state only and must not become a duplicate permanent context document.
- Before implementation, extract change-specific Design Intent and map material contracts / Acceptance Criteria to implementation surfaces and validation evidence.
- Prefer one Bootstrap Read followed by Incremental Reads, and batch coherent GitHub reads/writes and CI phases without weakening expected-HEAD checks, conflict handling, security, self-review, or final validation.
- Reuse revision-bound evidence and known resource/run identifiers while they remain valid; refresh mutable state when current-state, write, staleness, or rerouting conditions require it.
- When an existing behavior is expected to remain unchanged but proof is missing, use the smallest focused validation that can distinguish an evidence gap from a production defect before altering stable production code when practical.
- Apply the Foundation complexity discipline: do not introduce abstractions, dependencies, layers, workflows, configuration formats, compatibility adapters, or permanent process artifacts without a current objective or real boundary.
- Stable consumer code is not migrated solely to conform to a newer Foundation default.

## UI-standard trial boundary

PR #50 is consumer evidence for a candidate UI standard beyond Foundation v0.7.2. Its Base UI, semantic runtime-token, OKLCH, CSS-first motion, and reduced-motion findings are not claimed as released v0.7.2 Foundation UI requirements. The product-specific palette, typography, timeline, information hierarchy, density, spacing, and composition remain application-owned.

## Adopted optional profiles

### Vercel Git Integration

- Consumer quality gates use the Foundation `web-ci.yml` workflow pinned to the recorded reusable-workflow commit SHA.
- Hosting deployment is delegated to Vercel Git Integration rather than a privileged GitHub Actions publisher.
- Pushes to `main` are the Production deployment path; feature branches and Pull Requests are the Preview deployment path.
- The repository does not duplicate Vercel Preview deployment with a custom GitHub Actions workflow.
- `vercel.json` matches the adopted Foundation Vite SPA fallback template and remains application-owned.

### Fixed Staging

- Fixed Staging follows the adopted Foundation read-only request -> trusted `workflow_run` publisher -> compare-and-swap ref update model.
- Only open same-repository PRs targeting `main` are eligible; selected PR code is never checked out or executed in a write-enabled GitHub publisher job.
- `staging` remains a mutable one-PR verification slot and is not a merge, release, or history branch.
- Cleanup uses the closed PR HEAD SHA as slot ownership evidence, so a stale close event cannot clear a newer occupant and PR retargeting does not strand the slot.
- Vercel Git Integration remains the deployment owner after GitHub moves the `staging` ref.
- The publisher keeps runner-scoped request-file paths at step scope so `${{ runner.temp }}` is evaluated only after a runner exists, matching the Foundation v0.7.2 correction.

### Application GitHub Releases

- Versioned GitHub Releases are published only after successful `main` CI.
- The app-owned `.github/workflows/release.yml` remains aligned with the adopted application-release profile and binds tags/releases to `workflow_run.head_sha`.
- Application version intent remains the root `package.json` version change.

## Adopted engineering/review rules

- Mandatory implementation-agent self-review remains separate from risk-based independent review.
- Codex GitHub Code Review is manual and selective; Automatic Review remains off.
- Every `@codex review` invocation, including re-review, requires a concrete rationale, risk category, expected review value, and explicit user/maintainer approval before execution.
- Independent review focuses on high-impact contract, regression, trust-boundary, state-integrity, concurrency, compatibility, CI/CD, deployment, rollback, and operational failure risks rather than lint/style noise.

## App-specific deviations

- Browser-rendered E2E remains enabled in the shared Web CI because it is part of this application's quality contract.
- Azure OIDC is not an active application deployment/runtime profile. The owner-wide Flexible FIC was validated separately during Foundation development, but this repository does not retain a privileged Azure workflow after that validation completed.
- Vercel deployment status and Foundation CI remain independently visible; Vercel Git Integration may begin Production deployment before post-merge CI for the exact Production SHA finishes.
- The Fixed Staging publisher keeps the canonical URL `https://staging.credentials.shimabell.dev` directly in the app-owned workflow instead of reading Foundation's optional `FIXED_STAGING_URL` repository variable. This is a configuration-location deviation only; the trust, request validation, concurrency, CAS, and cleanup contracts remain aligned with the adopted profile.

Copied Foundation rules/templates do not update automatically. Foundation upgrades must review the Foundation changelog/diff, preserve approved app-specific deviations, update copied contracts deliberately, update reusable-workflow SHAs only after review, and refresh this provenance record.
