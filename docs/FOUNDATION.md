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

- Unit/component tests are currently opted out because the selected baseline is still UI-only and contains no independently testable domain logic.
- Browser-rendered E2E remains enabled.
- The unit-test opt-out must be removed when domain logic is introduced.
