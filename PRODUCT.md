# Product Contract — Microsoft Credentials Tracker

## Purpose

Microsoft資格の取得状況と、次に必要な更新・期限・受験予定を一か所で確認できる個人向けWebアプリを目指す。

## Current milestone

Issue #4ではUIモックだけを実装する。実データとの接続は行わず、将来の認証・資格取得・更新履歴連携を検討できる情報設計を検証する。

## Primary user task

画面を開いたユーザーが、次に対応が必要な資格と日付を短時間で把握し、その後に各資格の取得日・状態・期限を確認できること。

## Mock scope

- 資格の状態
- 取得日
- 有効期限
- 更新可能時期や更新不要の説明
- 更新期限・更新開始・受験予定を含むスケジュール
- 月カレンダー

すべて静的なモックデータであり、実際のMicrosoftアカウント情報ではないことを画面上で明示する。

## Non-goals for this milestone

- Microsoft / Entra認証
- Microsoft Graph / Microsoft Learn API連携
- データベースや永続化
- 実際の有効期限計算や更新判定
- 通知・メール・ICS生成
- 資格の追加・編集・削除操作

## Future direction

実装段階ではアプリ側DBを資格状態のsource of truthとして扱うことを前提候補とし、Microsoft側から取得可能なデータは補助入力・同期手段として評価する。現在のモックではその方式を確定しない。
