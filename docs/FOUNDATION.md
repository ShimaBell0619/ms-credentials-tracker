# Foundation provenance

- Adopted Foundation version: 0.3.1
- Foundation commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Reusable workflow commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Adopted on: 2026-09-08

## Hosting adoption

- Consumer quality gates continue to use the Foundation `web-ci.yml` workflow pinned to the recorded full commit SHA.
- Hosting deployment is delegated to Vercel's Git integration rather than a privileged GitHub Actions publisher.
- Pushes to `main` are the Production deployment path; feature branches and Pull Requests are the Preview deployment path.
- The repository does not duplicate Vercel Preview deployment with a custom GitHub Actions workflow.
- Vercel's normal Vite detection is used; repository-specific Vercel configuration is limited to the SPA fallback needed for direct URL access and reloads.

## App-specific deviations

Deployment is intentionally different from the Foundation 0.3.1 GitHub Pages publishing path. The quality-gate contract is unchanged: `check`, `typecheck`, `test`, `build`, and browser-rendered E2E remain required.

The Vercel Git-integrated Preview workflow should be evaluated as a Foundation follow-up so future consumers can choose it without inheriting Pages candidate/publisher machinery.
