---
version: alpha
name: Microsoft Credentials Tracker
description: Date-led personal schedule for Microsoft certification renewal and expiry.
omitted: []
---

# Design System

## Overview

**Design direction: a modern, date-led credential management tool that starts with the most important current state.**

This product is not a generic SaaS dashboard. It is a personal Microsoft certification renewal schedule. The first question is "what needs attention now, and by when?" The interface then expands into a 90-day schedule and a full credential register.

The priority surface is state-aware rather than blindly deadline-only. Expired credentials take precedence, followed by credentials already inside their renewal window, then the next future deadline. A collection containing only non-expiring credentials must say so explicitly rather than presenting an ambiguous "no upcoming deadline" message.

The page introduction stays functional and compact. Do not add marketing-style hero copy or decorative product claims.

Credential import and Google Calendar sync are supporting workflows after initial setup. They are grouped under one compact `Data and integrations` entry instead of occupying permanent dashboard space.

When there are no stored credentials, normal dashboard sections are not useful. Show a focused onboarding state with a concise explanation and Transcript import as the primary action. Once credentials exist, switch to the normal management layout.

## UI foundation

- Use Tailwind CSS as the styling baseline and shadcn/ui-style primitives for established controls.
- Prefer established accessible primitives for Button, Dialog, Input, and similar generic controls instead of recreating interaction behavior in application CSS.
- Keep primitive components in `src/components/ui` visually generic and reusable.
- Build Microsoft Credentials Tracker-specific meaning one level above primitives, for example `CredentialStatus`, `PrimaryCredentialState`, `RenewalTimeline`, and `CredentialRegister`.
- Product pages may compose primitives in distinctive ways; they should not reproduce shadcn/ui demo layouts.
- Custom CSS is acceptable for structures that are clearer as purpose-built CSS, such as the proportional 90-day timeline. It is not the default mechanism for generic controls.

## Visual character

- Modern work-tool character rather than editorial, playful consumer, or generic SaaS-dashboard styling.
- Information density is medium to moderately high.
- Use calm neutral surfaces, strong typography hierarchy, and concise spacing rather than oversized empty areas.
- The interface should feel deliberate without relying on novelty or decorative complexity.

## Colors

- Neutral gray background and white surfaces form the baseline.
- Azure blue is an accent for primary actions, current/reference position, renewal-start events, and credential codes where Microsoft context is meaningful.
- Warning orange marks approaching deadlines and states requiring attention.
- Red is reserved for expired/error state.
- Green marks active/confirmed state where confirmation is actually known; it must not be used merely to indicate storage location.
- Slate is used for non-expiring and secondary state.
- Status meaning must always be available in text; color is never the only signal.

## Typography

- UI / Japanese: `Segoe UI Variable` first, with `Segoe UI`, `Yu Gothic UI`, `Hiragino Sans`, and `Noto Sans JP` fallbacks.
- Dates, credential codes, and day counts may use a monospace stack where alignment improves comparison.
- Do not add English micro-labels when they merely repeat a Japanese heading.
- Headings are information entry points, not marketing hero typography.
- Long Microsoft credential names must wrap naturally on narrow screens instead of being truncated.

## Layout

- Desktop hierarchy: compact app header → current attention state → 90-day schedule → full-width credential register.
- The credential register receives the full content width. Do not permanently reserve a side column for Google Calendar, a local month calendar, or a duplicate upcoming-events list.
- Keep the 90-day schedule as its own time-based structure rather than reducing it to a row of cards.
- The 90-day schedule is the primary in-app representation of upcoming renewal and expiry events. Events sharing the same date should share a single position on the visual rail and remain readable in the event list.
- Use a table for the desktop credential register because record comparison is a primary task.
- Mobile transforms the credential table into labeled vertical records rather than forcing horizontal scrolling.
- Mobile keeps the product name visible in the header. Supporting data/import/calendar operations remain behind the same compact utility entry used on desktop.
- Provide lightweight in-page links to schedule and credentials on mobile once dashboard data exists.
- Review at approximately 1440px, 390px, and 320px. Horizontal page overflow is not acceptable.
- Dialogs must fit narrow/mobile viewports without forcing page-level horizontal scrolling.

## State-specific composition

### No credentials

- Show onboarding instead of empty schedule/register/calendar sections.
- Explain the Transcript PDF flow briefly.
- Make `資格を取り込む` the primary action.
- State that PDF processing and saved credential data remain browser-local.

### Expired credentials present

- Expired state takes top priority, even when another credential has a future deadline.
- State the expired count and at least one affected credential in text.
- Provide a direct in-page path to the credential register.
- Never present this state as "no upcoming deadline" or otherwise imply that no attention is required.

### Renewal available

- Show that renewal is currently possible and retain the expiry date and days remaining.
- The app may direct the user to the in-app schedule. A credential-specific external Microsoft Learn deep link requires an explicit, maintained link contract and must not be invented from exam codes.

### Future deadline only

- Present the next deadline, credential identity, derived status, and remaining days.

### Non-expiring only

- Explicitly state that registered credentials do not require renewal.

## Surface, elevation, and shape

- Use moderate corner radius as the default for interactive controls and meaningful surfaces.
- A Surface/Card is appropriate only when the information is independently grouped or needs a clear interaction boundary.
- Do not wrap every section, metric, or row in a card merely to create hierarchy.
- Subtle surface shadow is allowed. Floating layers such as Dialog/Popover/Dropdown may use stronger elevation where it communicates layering.
- Avoid applying the same radius and shadow treatment mechanically to every element.

## Status expression

- Default to a small status dot or icon plus explicit text.
- Badge/Pill may be used when the compact container itself adds meaningful scanning value; it is not the default status treatment.
- Never represent validity as a task-progress bar.
- Distinguish storage location, integration connection, synchronization freshness, and synchronization failure; these are not one status.

## Components

- Header: persistent product identity, lightweight desktop navigation, and one `Data and integrations` utility entry.
- Page introduction: compact current-state heading plus reference date.
- `PrimaryCredentialState`: state-aware priority surface for expired, renewal-available, future-deadline, non-expiring-only, and incomplete-expiry cases.
- `RenewalTimeline`: proportional 90-day time axis plus a chronological accessible event list; same-date events are grouped.
- `CredentialStatus`: centralizes status copy and visual semantics.
- `CredentialRegister`: full-width comparison table on desktop and labeled records on mobile.
- `DataAndIntegrations`: groups supporting Transcript and Google Calendar workflows without turning them into dashboard sections.
- Transcript import dialog: select a Microsoft Learn Transcript PDF, explain local parsing, show matched/unresolved state in text, and require explicit confirmation before browser-local save.
- Google Calendar dialog: show a single consistent connection/sync state (`未接続`, `変更あり`, `同期済み`, or current-session `同期失敗`) plus sync details and action.

## Avoid generic AI/template patterns

The following are not individually forbidden. Avoid using them as automatic defaults or repetitive page-building formulas:

- repeated `Card + icon + heading + muted description` blocks;
- decorative KPI cards without a real comparison task;
- Badge/Pill for every state or metadata field;
- oversized hero headings and generic explanatory copy;
- gradients, glow, or abstract decoration without product meaning;
- excessively large whitespace that lowers scanning efficiency;
- copying the shadcn/ui example composition or another component-library demo layout;
- adding UI weight without a product, workflow, data, or accessibility reason.

Using a component library is not considered "AI-like" by itself. Product specificity comes from information architecture, content hierarchy, tokens, and composition.

## Do

- Preserve the attention-first hierarchy rather than preserving an old layout for its own sake.
- Use established primitives for generic interactions and semantic application components for product-specific meaning.
- Pair deadline/renewal/event colors with text labels.
- Review rendered Japanese wrapping, long credential names, focus, file-input overflow, and dialog overflow.
- Keep external-data confirmation status explicit in text.
- State clearly that the selected PDF is processed locally and the file itself is not retained.
- After material UI changes, use render → critique → fix → re-render.

## Don't

- Do not imitate Microsoft Learn UI.
- Do not present static/test data as live Microsoft account data.
- Do not upload a Transcript PDF to an application backend for this MVP.
- Do not let parsed external data appear as confirmed application state before explicit user confirmation.
- Do not restore a permanent calendar/sidebar merely because an earlier UI used one.
- Do not reintroduce manual credential add/edit/archive controls into the current UI without a new product decision.
