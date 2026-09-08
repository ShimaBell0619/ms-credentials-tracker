# Product Contract — Microsoft Credentials Tracker

## Purpose

Build a personal web application that lets a user quickly understand Microsoft certification status, the next renewal or expiry action, and planned certification events in one place.

## Current milestone

This pull request establishes the initial UI baseline using static mock data. It validates the information architecture and responsive presentation before authentication, external integrations, persistence, or real renewal logic are introduced.

The selected baseline is date-led: the user should identify the next required credential action first, then inspect the 90-day schedule and individual credential records.

## Primary user task

When the user opens the application, they should be able to identify the next credential that needs attention and its date within a few seconds, then review each credential's earned date, status, and expiry information.

## UI baseline scope

- credential status
- earned date
- expiry date
- renewal availability or non-expiring status
- renewal, expiry, and planned exam events
- 90-day schedule
- monthly calendar
- responsive layouts for desktop and narrow/mobile widths

All credential information is static mock data. The UI must clearly avoid presenting it as live Microsoft account data.

## Non-goals for the UI baseline

- Microsoft / Entra authentication
- Microsoft Graph or Microsoft Learn integration
- database or persistence
- real expiry calculations or renewal-state calculations
- notifications, email, or ICS generation
- credential add/edit/delete workflows

## Future direction

The next implementation phase should define the domain model and application source of truth before adding authentication or Microsoft integrations. The leading architecture direction is to keep the application's database as the source of truth for credential state and renewal history, while treating data obtainable from Microsoft as an assisted import or synchronization source where supported.

This direction remains subject to explicit design approval before persistence or external integrations are implemented.

## Language policy

Repository engineering and design documentation should be written in English. User-facing UI copy remains Japanese unless the product language direction is explicitly changed.
