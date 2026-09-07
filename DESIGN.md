---
version: alpha
name: Microsoft Credentials Tracker
description: A renewal-led credential record with comparable dates and a secondary agenda.
---

# Design System

## Direction — 更新期限を起点に読む資格台帳

一般的な集計dashboardではなく、**Renewal-led credential ledger**とする。
「何を、いつまでに更新するか」→「各資格の取得・有効期限」→「今後の予定」の順で読む。
台帳らしさは記録の比較可能性から生む。紙の質感、架空の印章、通し番号を装飾として追加しない。
Microsoft Learnの画面や認定バッジを模倣しない。

## Information hierarchy

- 次の更新: 唯一の囲みsurface。資格名、関連試験、取得日、有効期限、残日数を一まとまりにする。
- 有効期限は年と月日を区別して強調し、残日数は期限を補足する。別のサマリーに同じ残日数を繰り返さない。
- 保有数と更新可能数は一覧見出しにまとめる。均等なKPIカードにはしない。
- 一覧: 資格名・状態を一つの記録として扱い、取得日・有効期限を揃えて比較する。
- 予定: 日付と予定名を先に読む。資格名を省略記号で切らない。
- カレンダーは予定の補助として予定一覧の下に置く。操作機能を持たない日付をボタンにしない。
- AZ-104等は関連試験コード。資格の識別番号や認定バッジのように扱わない。

## Typography and spacing

- UI / 日本語: Segoe UI Variable / Segoe UI / platform Japanese sans fallback。
- 試験コード・日付: SFMono / Consolas / Liberation Mono、tabular numerals。
- 見出し23–30px、更新対象22–28px、資格名16–17px、日付13px、本文12–13px。
- 11pxは補足・一覧の列見出しなどに限定。重要な日付や状態に極小文字を使わない。
- 文言は日本語中心。機械的なuppercase eyebrow、番号、重複する英語ラベルを付けない。
- 余白は情報のまとまりに応じて変える。すべてのsectionを同じpaddingのcardに入れない。

## Color and surfaces

- Canvas `#f7f8f6`、renewal surface `#ffffff`、本文 `#242b30`。
- 補足 `#59656d`、罫線 `#d4dad9`。
- 青 `#185f91`: リンク、focus、カレンダー基準日。
- Amber `#79520d`: 更新可能と、その資格の期限。期限切れを意味しない。
- Green `#286247`: 有効。期限なしは中立色。
- 色は状態に割り当てる。資格ごとの恣意的な色分けは行わない。
- 状態は必ず文字で表現し、補助マーカーも更新可能＝四角、有効＝点、期限なし＝線とする。
- 更新枠の4px、カレンダーの3pxは境界を和らげるための角丸。角を四角くすること自体を目的にしない。
- 影、gradient、装飾イラストは不要。囲みは優先対象、罫線は記録の区切りに使う。

## Responsive behavior

- 最大1240px。Desktopは更新対象＋資格一覧を主列、予定＋calendarを282pxの補助列に置く。
- 1100px以下: 日付を各資格の下に移し、取得日・有効期限のラベルを各行で表示する。
- 850px以下: 更新→保有資格→予定のDOM順で一列化。補助列は余裕があれば2列。
- 540px以下: 予定・calendarも一列化。更新枠では有効期限と残日数を下段に並べる。
- 320pxまで水平スクロールなし。長い資格名は折り返す。

## Accessibility and mock honesty

- 見出し、section/article、dl、time、calendarのtableを用いる。
- 可視focus、資格一覧へのskip link、更新対象から該当記録へのanchorを持つ。
- 基準日と予定日は枠・下線・凡例の文字で区別し、読み上げでも日付の意味を伝える。
- 固定の2026/09/07は「サンプル基準日」と表示し「今日」と呼ばない。
- Mock dataとアカウント未連携を表示する。予定に通知の実装を暗示しない。
- 根拠のない進捗割合を表示しない。期限の経過を作業完了率のprogressbarで表現しない。
- 実際の更新処理、認証、API、DB、通知、期限計算は実装しない。
- reduced-motionを尊重。色だけに依存しないことは文字とブラウザー検証でも確認する。

## Review evidence

PR #2の初見レビュー、採用理由、残課題、検証方法は `docs/UI-REVIEW.md` に記録する。
