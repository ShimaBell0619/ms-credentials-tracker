---
version: alpha
name: Microsoft Credentials Tracker
description: Date-led personal schedule for Microsoft certification renewal and expiry.
omitted: []
---

# Design System

## Overview

**Design direction: 次に行動が必要な日付から逆算して読む、資格更新スケジュール。**

この画面は一般的なSaaS dashboardではなく、資格更新の予定表として設計する。最初に「何を・いつまでに」を読み、その後に90日スケジュール、資格台帳、月カレンダーへ詳細化する。

第一視線は次の期限。第二視線は90日内の更新・期限・受験予定。資格総数などの集計値は主目的ではないため、均等なKPIカードは置かない。

## Colors

- Neutral paper: warm gray / off-white。予定表・台帳として長時間見ても騒がしくならない背景。
- Azure blue: 現在位置・更新開始・資格コードなどMicrosoft資格との関連がある情報に限定。
- Warning orange: 期限や対応が必要な状態。
- Green: 有効状態。
- Slate: 期限なし・補助情報。
- 状態は必ずテキストと併記し、色単独では意味を伝えない。

## Typography

- UI / Japanese: Segoe UI Variableを先頭に、Yu Gothic UI / Hiragino Sans / Noto Sans JPを明示的fallbackとする。
- 日付・資格コード・日数: monospace。比較対象として桁位置を安定させる。
- 見出しはmarketing heroの大きさにせず、情報の開始点として使う。
- 長いMicrosoft資格名は省略せず、狭幅で自然にwrapさせる。

## Layout

- Desktop: 次の期限 → 90日スケジュール → 資格一覧 + 月カレンダー/直近予定。
- 90日スケジュールは全資格情報と同じカードにせず、時間軸そのものを独立した構造として見せる。
- 資格一覧は比較可能性を優先してtableを使う。
- Mobile: 次の期限を先頭に保持し、tableは各recordをラベル付き縦組みに変換する。
- 1440 / 390 / 320pxを最低review baselineとし、horizontal overflowを許容しない。

## Elevation & Depth

- Shadowを階層表現の基本にしない。
- border、rule、background差、spacingで情報を分ける。
- 次の期限だけwarning top ruleと淡い期限面で優先度を示す。

## Shapes

- 基本は直線的なschedule / register表現。
- pillは状態表示に使わず、status dot + textを使う。
- 円形はcalendar event markerなど、位置を示す小さな記号に限定する。

## Components

- Header: product identity、mock表示、セクション内navigation。
- Next action: 日付・資格・残日数を一つの期限recordとして表示。
- 90-day schedule: 時間軸とaccessibility向けevent list。
- Credential table: 資格、取得日、状態、有効期限/次回を比較。
- Calendar: 今月の予定位置を確認。
- Upcoming list: 直近の具体的予定を時系列表示。

## Do's and Don'ts

### Do

- 日付が主役である理由を画面構造に反映する。
- 期限・更新・予定の種類を色だけでなく文言でも示す。
- 実描画で日本語改行、長い資格名、focus、overflowを確認する。
- UI変更後は render → critique → fix → re-render を行う。
- 装飾を追加する前にproduct/data/workflow上の理由を説明できるか確認する。

### Don't

- 均等なKPIカードをdashboardらしさのためだけに並べない。
- gradient / glow / abstract illustrationを装飾目的で追加しない。
- 資格コードを架空の紋章・ロゴとして扱わない。
- 有効期間をtask progressのようなprogress barで表現しない。
- statusをpill化して情報量以上の視覚重量を与えない。
- Microsoft Learnの既存画面を模倣しない。
