# PR #2 UI review

Reviewed starting source: `01513afe8add0c556f66b70cf04b73a4954939ef`.
Scope: static UI, independent design review and implementation; no merge or service integration.

## Findings from the rendered starting screen

1. The large slogan and three equal summary cells competed with the next renewal. The same 42-day countdown appeared twice. On narrow screens the three stacked summaries put record details farther away.
2. The ledger direction was sensible, but repeated section numbers, uppercase English microcopy, tiny 9–11px dates, and identical framed panels made the result feel like a styled template. These are design judgments, not proof of AI authorship.
3. Each exam code appeared twice in a row, once in a fabricated colored emblem. The color did not represent a meaningful credential state. The code also looked like a certification identifier.
4. The percentage progress graphic had no reliable meaning: 84% was static, and its centered “current” label did not align with its marker. Passage of validity time is not task progress.
5. Strong existing choices: a prominent next renewal, a scannable credential list, paired earned/expiry dates, text status labels, and separation of records from schedules. These remain useful.

## Direction and changes

**Renewal-led credential ledger / 更新期限を起点に読む資格台帳**.

- One framed renewal record joins the credential, earned date, expiry date, and remaining days. The prominent date is the actual deadline; the countdown supports it.
- Counts live beside the record-list heading. Desktop dates line up in consistent columns; narrow layouts keep date labels inside each record.
- Related exam codes appear once per record, with an explicit relationship label. Decorative marks, arbitrary credential colors, repeated levels already present in the names, and section numbers were removed.
- A secondary date-first agenda precedes its supporting month calendar. Full credential names wrap rather than truncate.
- Native anchors work; a skip link and target focus were added. No fake renewal action was introduced.
- Fixed dates are labeled as sample data, including the reference date. Calendar dates have table semantics and text descriptions. Status has text and shape as well as color.

## Deliberately retained

- The existing overall information model and sample credentials; no new product workflow.
- A renewal container because it groups one urgent subject; modest corner rounding because harshness is not a product goal.
- System sans-serif type, monospaced dates/codes, and restrained semantic colors. These aid reading and comparison without remote fonts or assets.
- The headline wording, now smaller. It is understandable; changing every word is unnecessary.
- The calendar, as requested information architecture, with reduced priority behind the explicit agenda.

## Validation and evidence

Local `npm ci --ignore-scripts`, lint, typecheck and production build passed. The standard E2E command could not install OS dependencies in the local sandbox; Chromium download also timed out. Local browser file/network access was blocked. Required rendered checks therefore ran on GitHub Actions, with the existing PR preview used for browser inspection.

The original E2E assertions remain and capture 1440px/390px screenshots during review runs. Added checks cover 1440px, 390px and 320px, overflow, visible renewal deadline, credential dates and status, calendar meaning, keyboard skip, anchor target and visible focus. The reusable Foundation CI remains the permanent quality gate.

Validation of implementation commit `4380c10` passed in [CI run 34140685427](https://github.com/ShimaBell0619/ms-credentials-tracker/actions/runs/34140685427): lint, typecheck, build and all four E2E tests, including the existing smoke test. A one-time `ui-review-evidence` artifact was captured during this review and inspected at desktop (1440px), mobile (390px), narrow (320px), and focused-record states. That artifact was review evidence only; the dedicated evidence job is not retained in the permanent CI because it would duplicate install/build/E2E work on every push.

The image review caught two typography issues, corrected in the follow-up: a stranded Japanese headline suffix on mobile, and Linux's Japanese serif fallback. Phrase spans now preserve natural breaks, and the system font stack explicitly includes Noto Sans JP/CJK and IPAGothic. The existing headline text is unchanged.

Final HEAD verification remains covered by the normal Foundation CI and Pages preview deployment.

## Remaining scope

This four-record static mock does not demonstrate long portfolios, expired/suspended credentials, empty/loading/error states, actual reminder delivery or renewal history. Those require product decisions and realistic data states. The fixed deadline and count must not be interpreted as a real calculation. Screenshot and keyboard checks do not establish full accessibility conformance or cross-browser compatibility.
