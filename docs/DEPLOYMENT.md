# GitHub Pages deployment

## Publishing model

GitHub Pagesのpublishing sourceは**GitHub Actions**です。

- `main` pushは本番サイトをPages rootへ公開します。
- same-repository PRは一時previewを`pr-<number>/`へ公開します。
- PR close時はそのPRのpreviewだけ削除します。
- fork PRはprivileged publish対象外です。
- 公開処理は1つのconcurrency groupで直列化し、同時更新による取りこぼしを防ぎます。

Viteは本番では`/ms-credentials-tracker/`、PRでは`/ms-credentials-tracker/pr-<number>/`をbase pathとしてbuildします。

## GitHub Actions flow

本番・PRともに、最終公開はGitHub公式のPages Actionsを使います。

1. sourceをcheckout
2. `npm ci`
3. Vite build
4. Pages公開内容を組み立て
5. `actions/upload-pages-artifact`
6. `actions/deploy-pages`

`pages-content`ブランチは、本番と一時PR previewを1つのPages artifactへまとめるための内部ストレージです。GitHub Pagesのpublishing sourceとして直接指定するブランチではありません。

最初のmain publish前にPR previewだけが存在する場合は、Pages rootにpreviewへの簡易indexを配置します。mainが公開された後はrootが本番になり、開いている`pr-*` previewは維持されます。

## PR review images

same-repository PRのpublishでは、Pages workflowがChromiumでレビュー用画像を取得します。

- mobile: 390px幅
- desktop: 1440px幅

画像はpreview本体と同じ`pr-<number>/review/`へ公開します。PR Conversationには専用コメントを1件だけ作成し、mobile画像をインライン表示、desktop画像を折りたたみ表示します。PR更新時は同じコメントを更新するため、コメントは増殖しません。

PR close時はpreview本体と画像を削除し、同じコメントをclosed表示へ更新します。GitHub Actions artifactはUI確認の主導線として使用しません。

## Security boundary

privileged publish jobはsame-repository PRだけを対象とし、fork PRは除外します。通常のWeb App Foundation CIはPages公開とは独立しており、application変更のquality gateとして維持します。

## Repository setting

Repository Settings > Pages > Build and deployment > Source は **GitHub Actions** を使用します。

現在のworkflowは`actions/upload-pages-artifact`と`actions/deploy-pages`で直接Pages deploymentを作成します。`gh-pages`をpublishing sourceにする設定は不要です。

## URLs

- Production: `https://shimabell0619.github.io/ms-credentials-tracker/`
- PR #N preview: `https://shimabell0619.github.io/ms-credentials-tracker/pr-N/`

PRのDeployment environmentはpreview URLを直接指すため、GitHub上から対象PRの一時画面へ移動できます。
