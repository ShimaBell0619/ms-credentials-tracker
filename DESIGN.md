---
version: alpha
name: Microsoft Credentials Tracker
description: Calm, date-first credential ledger for Microsoft certification status and renewal timing.
---

# Design System

## Direction

このアプリは一般的なSaaS dashboardではなく、**Credential Ledger / 資格記録台帳**として設計する。

資格名そのものより「次に何がいつ起きるか」を速く把握できることを優先し、UIの形はcredential code、取得日、有効期限、更新履歴、calendarといった製品固有の情報から導く。

## Visual principles

- 装飾より日付・状態・階層を優先する。
- すべてをcardにせず、rule、row、column、spacingで情報を構造化する。
- 大きい数値、資格code、dateにはmonospace / tabularな表現を使う。
- Accent colorは状態と現在位置に使い、画面全体をaccent色で染めない。
- Border radiusは小さく抑え、pillは意味上必要な場合だけ使う。
- 状態は色だけで伝えず、必ずtextを併記する。

## Anti-generic / Anti-AI defaults

以下を理由なく採用しない。

- 同サイズのsummary cardを均等に並べるだけの構成
- iconをsoft colorのrounded squareへ入れる定型表現
- 装飾目的だけのblue/purple gradient
- 製品データと関係しないorb、blob、abstract illustration
- uppercase eyebrowを全sectionへ機械的に付けること
- あらゆる状態をrounded pillにすること
- 強いdrop shadowで階層を作ること

これらを使う場合は、そのcomponentや情報の意味から説明できることを条件とする。

## Colors

- Canvas: `#f1f2ef`
- Surface: `#fbfbf8`
- Primary text: `#1c2025`
- Muted text: `#66707a`
- Border: `#d5d8da`
- Strong border: `#aeb4b9`
- Primary/current accent: `#0f6cbd`
- Renewal warning: amber semantic role
- Active: green semantic role
- No-expiry: neutral slate semantic role

## Typography

- UI / Japanese: Segoe UI Variable / Segoe UI / platform Japanese sans fallback.
- Credential code / dates / counters: SFMono / Consolas / Liberation Mono fallback.
- 大見出し、section見出し、本文、metadataの4段階程度に抑える。
- 数値と期限はサイズだけではなく書体・column構造でも区別する。

## Layout

- Desktop: max-width 1180pxの中央コンテナ。
- Summary ledger → 次回更新record → 資格一覧 + calendar / upcomingの2カラム。
- 900px以下で下段を再配置し、640px以下は原則1カラム。
- Device名による分岐はせず、利用可能幅でレスポンシブ化する。

## Elevation & depth

基本はborder、surface差、spacingで階層化する。drop shadowは原則使わない。
Featured renewalもgradientやfloating illustrationではなく、ruleとtypographyで強調する。

## Components

Issue #1で現れる反復パターンはSummary ledger item、Credential row、Status label、Calendar、Upcoming timeline。
抽象化は反復が明確な範囲に留める。

## Do

- 次の更新対象と残り日数を最も見つけやすくする。
- 取得日と有効期限を同じ視線の流れで比較できるようにする。
- Credential codeとdateを記録情報として視覚的に扱う。
- Mock dataであることを常時確認できるようにする。
- Wide/narrow双方を実ブラウザで検証する。

## Don't

- Microsoft Learnの実UIを模倣しない。
- ロジック未実装の操作ボタンを動くように見せない。
- 認証やAPI連携が存在するような表示をしない。
- Dark mode、theme picker、複雑なmotionをIssue #1に追加しない。
- 「モダンに見えるから」という理由だけでgeneric SaaS patternを追加しない。
