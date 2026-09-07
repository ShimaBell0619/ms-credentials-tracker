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

Pagesの公開物は`gh-pages`ブランチで管理します。

- main: `https://shimabell0619.github.io/ms-credentials-tracker/`
- PR preview: `https://shimabell0619.github.io/ms-credentials-tracker/pr-<number>/`

同一リポジトリのPRは更新のたびに固有のpreview pathへ反映され、PR上のbot commentから開けます。PR close時はそのpreviewだけ削除します。外部fork PRはprivileged publish対象外です。

初回のみRepository Settings > Pagesで`Deploy from a branch`、`gh-pages`、`/(root)`を選択します。詳細は`docs/DEPLOYMENT.md`を参照してください。

Foundation provenance is recorded in `docs/FOUNDATION.md`.
