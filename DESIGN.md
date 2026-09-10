---
version: alpha
name: Microsoft Credentials Tracker
description: Date-led personal schedule for Microsoft certification renewal and expiry.
omitted: []
---

# Design System

## Overview

**Design direction: a modern, date-led credential management tool that starts with the next required action.**

This product is not a generic SaaS dashboard. It is a personal Microsoft certification renewal schedule. The first question is "what needs attention, and by when?" The interface then expands into a 90-day schedule, credential register, calendar, and upcoming events.

The first visual priority is the next deadline. The second is renewal and expiry activity within the next 90 days. Aggregate counts are secondary, so the design does not use equal-weight KPI cards.

The page introduction stays functional and compact. Do not add marketing-style hero copy or decorative product claims.

Credential import and Google Calendar sync are supporting workflows. They belong in compact utility actions and focused dialogs rather than becoming competing dashboard sections.

## UI foundation

- Use Tailwind CSS as the styling baseline and shadcn/ui-style primitives for established controls.
- Prefer established accessible primitives for Button, Dialog, Input, and similar generic controls instead of recreating interaction behavior in application CSS.
- Keep primitive components in `src/components/ui` visually generic and reusable.
- Build Microsoft Credentials Tracker-specific meaning one level above primitives, for example `CredentialStatus`, `NextRenewal`, `RenewalTimeline`, and `CredentialRegister`.
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
- Warning orange marks deadlines and states requiring attention.
- Green marks active/confirmed state.
- Red is reserved for expired/error state.
- Slate is used for non-expiring and secondary state.
- Status meaning must always be available in text; color is never the only signal.

## Typography

- UI / Japanese: `Segoe UI Variable` first, with `Segoe UI`, `Yu Gothic UI`, `Hiragino Sans`, and `Noto Sans JP` fallbacks.
- Dates, credential codes, and day counts may use a monospace stack where alignment improves comparison.
- Headings are information entry points, not marketing hero typography.
- Long Microsoft credential names must wrap naturally on narrow screens instead of being truncated.

## Layout

- Desktop hierarchy: page title → next deadline → 90-day schedule → credential register + calendar/upcoming events.
- Keep the 90-day schedule as its own time-based structure rather than reducing it to a row of cards.
- Use a table for the desktop credential register because record comparison is a primary task.
- Mobile transforms the credential table into labeled vertical records rather than forcing horizontal scrolling.
- Review at approximately 1440px, 390px, and 320px. Horizontal page overflow is not acceptable.
- Dialogs must fit narrow/mobile viewports without forcing page-level horizontal scrolling.

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

## Components

- Header: product identity, compact import utility, Google Calendar utility, local-data state, and lightweight in-page navigation.
- Page introduction: functional title plus reference date.
- `NextRenewal`: date, credential, state, next action, and remaining days as one priority surface.
- `RenewalTimeline`: proportional 90-day time axis plus an accessible event list.
- `CredentialStatus`: centralizes status copy and visual semantics.
- `CredentialRegister`: comparison table on desktop and labeled records on mobile.
- Calendar: locates the current/reference date and events; when Google Calendar is connected, the external-calendar panel may replace the local month display.
- Upcoming list: concrete near-term events in chronological order.
- Transcript import dialog: select a Microsoft Learn Transcript PDF, explain local parsing, show matched/unresolved state in text, and require explicit confirmation before browser-local save.

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

- Preserve the next-deadline-first hierarchy.
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
- Do not reintroduce manual credential add/edit/archive controls into the current UI without a new product decision.
