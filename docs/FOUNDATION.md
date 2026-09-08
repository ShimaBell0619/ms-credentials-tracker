# Foundation provenance

- Adopted Foundation version: 0.3.1
- Foundation commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Reusable workflow commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Adopted on: 2026-09-08

## Quality-gate adoption

- The consumer uses the pinned Foundation reusable Web CI workflow.
- `check`, `typecheck`, `test`, `build`, and browser-rendered E2E remain required.
- Deployment is intentionally not coupled to the quality workflow.

## Hosting adoption

- Production and Pull Request previews use Vercel through its standard Git integration.
- `main` is the production branch; Pull Requests receive Preview Deployments.
- No custom GitHub Actions workflow is used to deploy to Vercel.
- The application keeps a minimal `vercel.json` only for SPA deep-link fallback to `index.html`.

## App-specific deviations

The consumer no longer adopts the Foundation GitHub Pages candidate/publisher workflow because hosting has moved to Vercel. This is a hosting-path deviation only; there are no quality-gate deviations for the domain-enabled application.
