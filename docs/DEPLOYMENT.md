# GitHub Pages deployment

## Publishing model

Compiled static assets are stored on the `gh-pages` branch.

- `main` publishes to the Pages site root.
- Same-repository pull requests publish to `pr-<number>/`.
- Before the first main publish, the Pages root is a small index of available PR previews.
- Main publishing preserves existing `pr-*` preview directories.
- Closing a PR removes only that PR directory.
- Pages publish runs are serialized through one concurrency group to avoid lost updates between previews.

The application uses Vite `base: './'` so generated assets resolve from both the repository Pages path and nested PR preview paths. `npm run build` verifies that the generated HTML does not contain root-absolute local asset URLs.

## Security boundary

The publish workflow has repository write permissions, so it only publishes pull requests whose head repository is the same repository. Fork pull requests are not executed in the privileged publishing job.

The normal Foundation CI remains independent from publishing and should stay the quality gate for application changes.

## One-time repository setup

GitHub Pages branch publishing must use:

1. Repository Settings > Pages.
2. Source: `Deploy from a branch`.
3. Branch: `gh-pages`.
4. Folder: `/(root)`.

The workflow reads the current Pages configuration through the GitHub Pages REST API. If the source is missing or points somewhere else, it emits a warning instead of requesting the wrong build.

The connected GitHub automation available to ChatGPT can write repository files and branches but does not expose the Pages administration mutation needed to change this repository setting directly.

After Pages is configured, the publish workflow explicitly requests a Pages rebuild through the GitHub Pages REST API after each `gh-pages` update. GitHub documents that commits pushed by a workflow `GITHUB_TOKEN` do not themselves trigger a branch-source Pages build, so the explicit build request is intentional.
