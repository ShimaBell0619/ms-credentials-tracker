# Product Contract

Status: initial mock baseline.

## 1. Purpose

Microsoft credentialsの取得日・有効期限・更新時期を一か所で把握し、更新忘れを減らすための個人向けWebアプリを目指す。

## 2. Users and primary jobs

- Microsoft資格を複数保有する個人。
- 保有資格を一覧で確認する。
- 次に更新が必要な資格と日付を素早く把握する。
- 取得・更新の時系列をカレンダー感覚で確認する。

## 3. Core behaviors

今回のIssue #1ではUIモックのみをサポートする。表示データはすべて静的なサンプルであり、実ユーザーデータではない。

将来候補の認証、資格インポート、永続化、通知、更新履歴はこの時点では未確定であり、UIモックから実装契約を推測してはならない。

## 4. Product constraints

- Browser-firstのレスポンシブWeb UIとする。
- 重要な状態は色だけで表現しない。
- 実データ連携前はMock dataであることを明示する。

## 5. Non-goals

Issue #1では次を実装しない。

- Microsoft/Entra認証
- Microsoft Graph / Microsoft Learn連携
- データベースやローカル永続化
- 実際の期限計算・更新判定
- メール、Push、カレンダー等への通知
- デプロイ先の選定

## 6. Acceptance boundaries

- Wide/narrow両方で主要情報が読み取れること。
- 水平スクロールを発生させないこと。
- CIでcheck/typecheck/buildが成功すること。
- Chromiumで実際にレンダリングしたsmoke testが成功すること。

## 7. Evolution rules

実データ取得、認証、永続化、通知などの境界を追加する場合は、実装前にPRODUCT.mdを更新する。
