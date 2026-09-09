# Foundation provenance

- Adopted Foundation version: 0.4.0
- Foundation commit: `7b2ac5cb75b0055489a0f9e2c8864672145bb30e`
- Reusable workflow commit: `7b2ac5cb75b0055489a0f9e2c8864672145bb30e`
- Adopted on: 2026-09-09

## Adopted optional profiles

### Vercel Git Integration

- Consumer quality gates continue to use the Foundation `web-ci.yml` workflow pinned to the recorded full commit SHA.
- Hosting deployment is delegated to Vercel's Git integration rather than a privileged GitHub Actions publisher.
- Pushes to `main` are the Production deployment path; feature branches and Pull Requests are the Preview deployment path.
- The repository does not duplicate Vercel Preview deployment with a custom GitHub Actions workflow.
- `vercel.json` matches the Foundation v0.4.0 Vite SPA fallback template exactly and remains application-owned.

### Application GitHub Releases

- Versioned GitHub Releases are published only after successful `main` CI.
- The release workflow is aligned with the Foundation v0.4.0 application-release template and binds tags/releases to `workflow_run.head_sha`.
- Application version intent remains the root `package.json` version change.

## App-specific deviations

- Browser-rendered E2E remains enabled in the shared Web CI because it is part of this application's quality contract.
- Azure OIDC is not an active application deployment/runtime profile. The owner-wide Flexible FIC was validated separately during Foundation development, but this repository does not retain a privileged Azure workflow after that validation completed.
- Vercel deployment status and Foundation CI remain independently visible; Vercel Git Integration may begin Production deployment before post-merge CI for the exact Production SHA finishes.
- This repository is the proving consumer for a fixed-Origin Staging slot. The app-specific Staging workflows move only the `staging` Git ref and leave hosting to Vercel Git Integration; this profile is not yet part of the adopted Foundation v0.4.0 contract and should be generalized only after the consumer implementation is proven.

Copied Foundation rules/templates do not update automatically. Foundation upgrades must review the Foundation changelog/diff, preserve approved app-specific deviations, update copied contracts deliberately, update reusable-workflow SHAs only after review, and refresh this provenance record.
