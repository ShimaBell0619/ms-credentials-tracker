# Microsoft Credentials Tracker

Microsoft credentialsの取得日・有効期限・更新時期を整理するためのWebアプリです。

## Current milestone

Issue #1では、実データ連携より先に情報設計とレスポンシブUIを検証するための**UIモック**を実装します。

- React + TypeScript + Vite
- Web App Foundation v0.2.0準拠
- static mock credential data only
- Microsoft認証 / Graph / Learn API / DB / reminder logic は未実装

## Development

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check
npm run typecheck
npm run build
npm run test:e2e
```

## GitHub Pages

GitHub Pagesは**GitHub Actions**から公開します。ビルド済みファイルをPagesの公開ブランチとして直接指定する方式は使いません。

- main: `https://shimabell0619.github.io/ms-credentials-tracker/`
- PR preview: `https://shimabell0619.github.io/ms-credentials-tracker/pr-<number>/`

`main` pushではVite buildをPages artifactとしてアップロードし、`actions/deploy-pages`で本番へ反映します。同一リポジトリのPRは一時的な`pr-N` pathへ反映し、PR close時に削除します。fork PRはprivileged publish対象外です。

PR previewを本番と共存させるため、公開内容の組み立て用に`pages-content`ブランチを内部ストレージとして使います。このブランチ自体はGitHub Pagesのpublishing sourceではありません。

詳細は`docs/DEPLOYMENT.md`を参照してください。

Foundation provenance is recorded in `docs/FOUNDATION.md`.
