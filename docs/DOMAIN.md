# Credential domain contract

## Purpose

This document records the approved credential-domain and MVP data-boundary decisions for Microsoft Credentials Tracker. It is the implementation contract for domain logic introduced after the selected PR #5 UI baseline.

## Domain entities

### CredentialDefinition

Represents an application-owned definition of a Microsoft credential. It is distinct from a user's earned credential instance.

- uses an immutable application-owned ID
- distinguishes `certification` and `appliedSkill`
- keeps Microsoft names, exam codes, URLs, or future external IDs as metadata rather than primary keys
- owns explicit validity and renewal policy

An exam code such as `AZ-104` is not the identity of a Certification.

### UserCredential

Represents a credential confirmed as earned by the user.

- references one `CredentialDefinition`
- stores confirmed facts such as first earned date and current expiry date
- remains the same logical credential across renewals
- does not persist UI status, remaining days, renewal-opening date, or next-action copy

### CredentialHistory

Represents confirmed lifecycle events such as initial earning, renewal, or correction.

History is append-oriented. The application is not event-sourced: current facts may remain directly available on `UserCredential`, while history preserves how the current state was reached.

### PlannedExam

Represents a future exam or assessment plan. It is separate from a credential instance and from confirmed credential history because a planned or completed exam does not necessarily imply that a Certification was earned.

## Stored facts versus derived values

Persist confirmed facts:

- credential definition identity
- first earned date
- current expiry date when applicable
- confirmed lifecycle/history events
- source/provenance needed to understand imported facts

Derive values from facts and policy:

- current status
- renewal opening date
- days until expiry
- next required action
- schedule events generated from domain state

Do not copy the current mock fields such as `status` or `renewalNote` into persisted application state.

## Validity and renewal policy

Validity behavior is explicit metadata on `CredentialDefinition` rather than inferred only from credential kind or name.

The initial model supports:

- `nonExpiring`
- `expiring` with an explicit validity period and renewal window

`UserCredential.currentExpiresOn` remains a confirmed fact rather than being regenerated solely from an earned date.

## Lifecycle and deletion

Renewal extends the same `UserCredential` and appends renewal history; it does not create a new user credential identity.

Normal user-facing deletion should archive or hide a confirmed credential so history is not casually destroyed. Hard deletion is reserved for clearly erroneous records or a future explicit data-removal flow.

## Application source of truth

After explicit user confirmation, application-owned credential data is the working source of truth. Microsoft-side data is an assisted import or reconciliation source and must not silently overwrite confirmed user data.

For the MVP, the source of truth is deliberately browser-local rather than server-side. The storage boundary is provisional and must remain replaceable by a later persistence/API implementation.

Authentication, multi-user ownership, server-side persistence, and organization/tenant concepts are deferred.

## MVP browser storage

Confirmed credential records are stored in a versioned local-storage envelope.

This is a product-scope decision for the MVP, not a permanent architecture endorsement of Local Storage. Domain parsing and normalization must remain independent from the storage implementation.

## Microsoft Learn Transcript import

The primary assisted-input path is a Microsoft Learn Transcript PDF saved by the user through the browser's print/save flow.

Pipeline:

1. user opens the Microsoft Learn Transcript and saves it as PDF
2. user selects the PDF in the application
3. PDF.js extracts the text locally in the browser; the PDF is not uploaded to an application server
4. parser extracts supported external records and normalizes them into `ImportCandidate` values
5. candidates are matched against the local `CredentialDefinition` catalog
6. unresolved candidates remain unresolved; the application must not invent a credential identity
7. user explicitly reviews and confirms candidates
8. only confirmed, matched records become application data

The selected PDF file itself is transport/input material and is not persisted. Only confirmed normalized credential facts are written to the versioned browser-local store.

The Transcript PDF layout is not treated as a Microsoft API contract. Parsing must remain tolerant and conservative across supported date/label layouts. Image-only or scanned PDFs are not OCR'd in this MVP.

The shared-URL route was empirically rejected for the MVP: browser fetch is blocked by CORS, while a trusted server-side fetch retrieved only the initial page shell without the credential facts visible after normal browser rendering. The application therefore does not depend on shared-page scraping, browser automation, or undocumented internal Microsoft Learn endpoints.

Manual-entry UX and any future Microsoft synchronization path are separate follow-ups. A future API/synchronization path must enter through the same reconciliation boundary rather than bypassing user-owned application state.

## Current UI boundary

The PR #5 date-led UI remains the product baseline.

During the first import slice, browser-local imported records are intentionally not allowed to drive the existing next-action, 90-day schedule, credential register, calendar, or upcoming-event mock data until the required date/status projection logic is implemented and tested. This prevents partially implemented domain behavior from being presented as live credential state.

## Testing contract

Independent domain logic requires unit tests. The previous UI-only unit-test opt-out is no longer valid once Transcript parsing and normalization are introduced.

Required gates are:

- `check`
- `typecheck`
- `test`
- `build`
- browser-rendered E2E
