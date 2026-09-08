---
version: alpha
name: Microsoft Credentials Tracker
description: Date-led personal schedule for Microsoft certification renewal and expiry.
omitted: []
---

# Design System

## Overview

**Design direction: a date-led credential renewal schedule that starts with the next required action.**

This screen is not a generic SaaS dashboard. It is a personal certification renewal schedule. The first question is "what needs attention, and by when?" The interface then expands into a 90-day schedule, credential register, monthly calendar, and upcoming events.

The first visual priority is the next deadline. The second is renewal, expiry, and planned exam activity within the next 90 days. Aggregate counts are secondary, so the design does not use equal-weight KPI cards.

The page introduction should remain quiet: show the functional title `資格の更新予定` and the sample reference date, then let the deadline record and timeline communicate the date-led concept. Do not explain the design concept with marketing-style hero copy.

## Colors

- Neutral paper: warm gray / off-white for a calm schedule and register surface.
- Azure blue: reserved for current/reference position, renewal-start events, and credential codes where Microsoft context is meaningful.
- Warning orange: deadlines or states that require attention.
- Green: active/valid state.
- Slate: non-expiring and secondary information.
- Status meaning must always be available in text; color is never the only signal.

## Typography

- UI / Japanese: `Segoe UI Variable` first, with `Yu Gothic UI`, `Hiragino Sans`, and `Noto Sans JP` as explicit fallbacks.
- Dates, credential codes, and day counts: monospace to keep comparison values aligned.
- Headings should act as information entry points, not marketing hero typography.
- Long Microsoft credential names must wrap naturally on narrow screens instead of being truncated.

## Layout

- Desktop: next deadline → 90-day schedule → credential register + monthly calendar/upcoming events.
- Keep the 90-day schedule as its own time-based structure rather than placing every credential detail into the same card pattern.
- Use a table for the credential register because comparison across records is a primary task.
- Mobile: preserve the next deadline first, then transform the table into labeled vertical records.
- Review at approximately 1440px, 390px, and 320px. Horizontal page overflow is not acceptable.

## Elevation and depth

- Do not use shadows as the default hierarchy mechanism.
- Separate information with borders, rules, background differences, and spacing.
- Only the next deadline receives the warning top rule and a light deadline surface to indicate priority.

## Shapes

- Prefer straight schedule/register geometry.
- Do not turn status into pills; use status dot + text.
- Reserve circles for small positional markers such as calendar events.

## Components

- Header: product identity, mock-state indicator, and in-page navigation.
- Page introduction: functional title plus sample reference date only; do not repeat the design concept in explanatory hero copy.
- Next action: date, credential, and remaining days presented as one deadline record.
- 90-day schedule: visual time axis plus an accessible event list.
- Credential table: compare credential, earned date, status, and expiry/next action.
- Calendar: locate current sample-month events. Static mock UI must label the reference date as a sample/reference date rather than "today".
- Upcoming list: concrete near-term events in chronological order.

## Do

- Express the date-led hierarchy through layout, not explanatory copy.
- Pair deadline/renewal/event type colors with text labels.
- Review rendered Japanese wrapping, long credential names, focus, and overflow.
- After material UI changes, use render → critique → fix → re-render.
- Require a product, data, workflow, or accessibility reason before adding decorative UI weight.

## Don't

- Do not add equal KPI cards simply to make the screen look like a dashboard.
- Do not add gradients, glow, or abstract illustration as decoration.
- Do not present credential codes as invented crests, badges, or logos.
- Do not represent credential validity as task progress with a progress bar.
- Do not give status more visual weight than its information value through pills.
- Do not imitate the Microsoft Learn UI.
- Do not explain the date-led design concept with marketing hero copy.
