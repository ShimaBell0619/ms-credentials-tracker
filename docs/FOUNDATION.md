# Foundation provenance

- Adopted Foundation version: 0.3.1
- Foundation commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Reusable workflow commit: `5382fc2c0735ce82c54dd05c07cb369d4b3b536a`
- Adopted on: 2026-09-08

## Pages adoption

- The trusted Pages publisher caller is installed on the default branch before PR preview publication.
- UI/consumer PRs build an unprivileged Pages candidate.
- The default-branch `workflow_run` publisher validates provenance before publishing production or `/pr-N/` preview content.
- The privileged publisher does not checkout or execute PR code.

## App-specific deviations

There are currently no quality-gate deviations for the domain-enabled application.

The previous UI-only unit-test opt-out ended when independently testable transcript parsing and domain normalization were introduced. `check`, `typecheck`, `test`, `build`, and browser-rendered E2E are now required by the consumer CI contract.
