# Product Contract — Microsoft Credentials Tracker

## Purpose

Build a personal web application that lets a user quickly understand Microsoft certification status, the next renewal or expiry action, and planned certification events in one place.

## Current milestone

The initial UI baseline is established by PR #5. The current milestone introduces the first credential-domain logic and validates a browser-only Microsoft Learn Transcript shared-URL import path before server-side persistence, authentication, or Microsoft API integration is selected.

The selected UI baseline remains date-led: the user should identify the next required credential action first, then inspect the 90-day schedule and individual credential records.

## Primary user task

When the user opens the application, they should be able to identify the next credential that needs attention and its date within a few seconds, then review each credential's earned date, status, and expiry information.

A supporting input task is to bring known Microsoft credential facts into the application with minimal manual transcription while keeping the user in control of what becomes confirmed application data.

## UI baseline scope

- credential status
- earned date
- expiry date
- renewal availability or non-expiring status
- renewal, expiry, and planned exam events
- 90-day schedule
- monthly calendar
- responsive layouts for desktop and narrow/mobile widths

The existing schedule/register content remains static mock data until imported credential facts are connected to tested domain projections. The UI must clearly avoid presenting mock content as live Microsoft account data.

## Current domain/import scope

- define credential definitions separately from user-earned credential instances
- distinguish Certifications, Applied Skills, exams, planned exams, and credential lifecycle history
- keep confirmed facts separate from derived status/schedule values
- accept and validate Microsoft Learn Transcript share URLs
- attempt browser-only retrieval of the public shared Transcript and parse the returned content into import candidates
- match candidates conservatively against a local credential catalog
- require explicit user confirmation before saving imported credentials
- use versioned browser-local storage as the provisional MVP application source of truth
- enable unit tests for independently testable domain logic

## Non-goals for the current milestone

- Microsoft / Entra authentication
- server-side API or database
- automatic Microsoft synchronization
- Microsoft Graph as the credential-history source of truth
- third-party CORS proxy services
- PDF parsing
- complete manual-entry workflow
- notifications, email, or ICS generation
- replacing the existing mock schedule with partially implemented live projections

## Source-of-truth direction

After user confirmation, application-owned credential data is the working source of truth. Microsoft data is treated as assisted import or future reconciliation input and must not silently overwrite confirmed application state.

For the MVP, confirmed data is stored in the browser. Server-side persistence and authentication are intentionally deferred until credential acquisition and domain behavior are better validated.

The current shared-URL transport is a feasibility step. If Microsoft Learn prevents browser cross-origin retrieval, a trusted stateless fetch endpoint may be evaluated separately without introducing a database or changing the import/reconciliation contract.

See `docs/DOMAIN.md` for the approved domain contract and storage boundary.

## Language policy

Repository engineering and design documentation should be written in English. User-facing UI copy remains Japanese unless the product language direction is explicitly changed.
