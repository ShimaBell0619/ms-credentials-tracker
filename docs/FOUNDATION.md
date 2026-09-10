# Foundation provenance

- Adopted Foundation version: 0.5.0
- Foundation commit: `a8c9098653446127e2610f4abaf44dd55ffe50a6`
- Reusable workflow commit: `a8c9098653446127e2610f4abaf44dd55ffe50a6`
- Adopted on: 2026-09-10

## Adopted optional profiles

### Vercel Git Integration

- Consumer quality gates use the Foundation `web-ci.yml` workflow pinned to the recorded full commit SHA.
- Hosting deployment is delegated to Vercel Git Integration rather than a privileged GitHub Actions publisher.
- Pushes to `main` are the Production deployment path; feature branches and Pull Requests are the Preview deployment path.
- The repository does not duplicate Vercel Preview deployment with a custom GitHub Actions workflow.
- `vercel.json` matches the Foundation v0.5.0 Vite SPA fallback template exactly and remains application-owned.

### Fixed Staging

- Fixed Staging follows the Foundation v0.5.0 read-only request -> trusted `workflow_run` publisher -> compare-and-swap ref update model.
- Only open same-repository PRs targeting `main` are eligible; selected PR code is never checked out or executed in a write-enabled GitHub publisher job.
- `staging` remains a mutable one-PR verification slot and is not a merge, release, or history branch.
- Cleanup uses the closed PR HEAD SHA as slot ownership evidence, so a stale close event cannot clear a newer occupant and PR retargeting does not strand the slot.
- Vercel Git Integration remains the deployment owner after GitHub moves the `staging` ref.

### Application GitHub Releases

- Versioned GitHub Releases are published only after successful `main` CI.
- The app-owned `.github/workflows/release.yml` matches the Foundation v0.5.0 application-release template and binds tags/releases to `workflow_run.head_sha`.
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
- The Fixed Staging publisher keeps the canonical URL `https://staging.credentials.shimabell.dev` directly in the app-owned workflow instead of reading Foundation's optional `FIXED_STAGING_URL` repository variable. This is a configuration-location deviation only; the trust, request validation, concurrency, CAS, and cleanup contracts remain aligned with v0.5.0.

Copied Foundation rules/templates do not update automatically. Foundation upgrades must review the Foundation changelog/diff, preserve approved app-specific deviations, update copied contracts deliberately, update reusable-workflow SHAs only after review, and refresh this provenance record.
