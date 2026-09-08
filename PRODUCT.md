# Product Contract — Microsoft Credentials Tracker

## Purpose

Build a personal web application that lets a user quickly understand Microsoft certification status, the next renewal or expiry action, and planned certification events in one place.

## Current milestone

The initial UI baseline was established by PR #5. Microsoft Learn Transcript PDF import and browser-local confirmed credential storage are established, and the current milestone connects those confirmed facts to the date-led credential register, next-deadline summary, 90-day schedule, calendar, and upcoming list through tested derived projections.

The selected UI remains date-led: the user should identify the next required credential action first, then inspect the schedule and individual credential records.

## Primary user task

When the user opens the application, they should be able to identify the next credential that needs attention and its date within a few seconds, then review each credential's earned date, derived status, and expiry information.

A supporting input task is to bring known Microsoft credential facts into the application with minimal manual transcription while keeping the user in control of what becomes confirmed application data.

## Current MVP scope

- credential status derived from confirmed facts
- earned date and current expiry date
- renewal availability or non-expiring status
- next credential deadline
- credential-derived renewal and expiry events
- 90-day schedule
- current-month calendar
- responsive layouts for desktop and narrow/mobile widths
- Microsoft Learn Transcript PDF import
- versioned browser-local persistence after explicit confirmation

When no confirmed credentials exist, the UI must show an intentional onboarding/empty state rather than presenting sample records as live data.

## Domain/import scope

- define credential definitions separately from user-earned credential instances
- distinguish Certifications, Applied Skills, exams/plans, and credential lifecycle history
- keep confirmed facts separate from derived status/schedule values
- accept a Microsoft Learn Transcript saved through `Print -> Save to PDF`
- extract PDF text locally in the browser; the PDF is not uploaded to an application server
- parse supported Transcript facts into import candidates
- match candidates conservatively against a local credential catalog
- require explicit user confirmation before saving imported credentials
- derive status, renewal opening, days-until-expiry, next deadline, and schedule events from confirmed data
- use versioned browser-local storage as the provisional MVP application source of truth
- require unit tests for independently testable domain logic

## Empirical input decision

The shared-URL approach was evaluated before selecting PDF import:

- direct browser retrieval of the shared Transcript was blocked by CORS
- a narrowly scoped Azure Function could retrieve the initial shared page HTML
- the initial server-retrieved HTML contained only the page shell and no credential/exam facts visible in the normal browser experience

The product therefore does not depend on scraping the shared page, browser automation, or an undocumented Microsoft Learn internal endpoint for the MVP. Transcript PDF import is the primary assisted-input path.

## Non-goals for the current milestone

- Microsoft / Entra authentication
- server-side API or database for credential data
- automatic Microsoft synchronization
- Microsoft Graph as the credential-history source of truth
- shared-URL scraping or browser automation
- third-party CORS proxy services
- OCR for image-only PDFs
- complete manual credential add/edit/archive workflow
- persisted passed-exam and historical-credential history
- planned-exam CRUD
- notifications, email, or ICS generation

## Source-of-truth direction

After user confirmation, application-owned credential data is the working source of truth. Microsoft data is treated as assisted import or future reconciliation input and must not silently overwrite confirmed application state.

For the MVP, confirmed data is stored in the browser. Server-side persistence and authentication are intentionally deferred until credential acquisition and domain behavior are better validated.

See `docs/DOMAIN.md` for the approved domain contract and storage boundary.

## Language policy

Repository engineering and design documentation should be written in English. User-facing UI copy remains Japanese unless the product language direction is explicitly changed.
