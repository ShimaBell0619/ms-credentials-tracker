---
version: alpha
name: Microsoft Credentials Tracker
description: Calm, date-first dashboard for tracking Microsoft credential status and renewal timing.
---

# Design System

## Overview

資格名そのものより「次に何がいつ起きるか」を速く把握できる、静かで情報密度の高いダッシュボードを目指す。装飾より日付・状態・階層を優先する。

## Colors

- Canvas: `#f5f7fb`
- Surface: `#ffffff`
- Primary text: `#182235`
- Muted text: `#6f7b8f`
- Border: `#e4e9f2`
- Primary/action accent: `#246bfd`
- Renewal warning: amber semantic role
- Active: green semantic role
- No-expiry: neutral slate semantic role

状態ラベルには必ずテキストを併記し、色のみで意味を伝えない。

## Typography

OS標準のui-sans-serif / Segoe UI系を使う。大見出し、section見出し、本文、metadataの4段階程度に抑える。数値と期限は周囲より強く表示する。

## Layout

- Desktop: max-width 1180pxの中央コンテナ。
- Summary 3枚 → 次回更新の強調カード → 資格一覧 + カレンダー/予定の2カラム。
- 900px以下で下段を再配置し、640px以下は原則1カラム。
- Device名による分岐はせず、利用可能幅でレスポンシブ化する。

## Elevation & Depth

基本は境界線とsurface差で階層化する。強いdrop shadowは使わない。次回更新カードのみ淡いaccent surfaceを許可する。

## Shapes

- Small: 10px
- Card: 16px
- Hero/featured card: 22px
- Status badge: pill

## Components

Issue #1で現れる反復パターンはSummary card、Credential row、Status pill、Calendar、Upcoming timeline。抽象化は反復が明確な範囲に留める。

## Do's and Don'ts

### Do

- 次の更新対象と残り日数を最も見つけやすくする。
- 取得日と有効期限を同じ視線の流れで比較できるようにする。
- Mock dataであることを常時確認できるようにする。
- Wide/narrow双方を実ブラウザで検証する。

### Don't

- Microsoft Learnの実UIを模倣しない。
- ロジック未実装の操作ボタンを動くように見せない。
- 認証やAPI連携が存在するような表示をしない。
- Dark mode、theme picker、複雑なmotionをIssue #1に追加しない。
