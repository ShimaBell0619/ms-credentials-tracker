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

The primary assisted-input path is the official Microsoft Learn Transcript share URL.

Pipeline:

1. user pastes a Transcript share URL
2. application validates that it is an HTTPS `learn.microsoft.com` Transcript share URL
3. browser sends the normalized URL to the dedicated stateless Transcript Function in a POST body
4. the Function independently validates the share URL and extracts only its share identifier
5. the Function constructs the fixed Microsoft Learn Transcript JSON endpoint internally with `locale=en-us`
6. the returned JSON is passed to the Transcript API source adapter
7. the adapter extracts supported external records and normalizes them into `ImportCandidate` values
8. candidates are matched against the local `CredentialDefinition` catalog
9. unresolved candidates remain unresolved; the application must not invent a credential identity
10. user explicitly reviews and confirms candidates
11. only confirmed, matched records become application data

The share URL itself is transport input and is not persisted as application credential data. Raw Transcript JSON is neither persisted nor logged by the application.

### Transport implementation note

The official browser-visible Transcript sharing flow is supported by Microsoft Learn, but the JSON endpoint currently used by the Function is not a documented public Microsoft API contract. The observed endpoint shape is:

```text
https://learn.microsoft.com/api/profiles/transcript/share/{share-id}?locale=en-us
```

It is therefore treated as a replaceable, best-effort source adapter for this personal MVP rather than as an authoritative synchronization contract. The Function never accepts this upstream URL from the caller; it constructs the fixed host/path from a previously validated official Transcript share URL.

The initial browser-visible page HTML is retained only as a temporary compatibility fallback during rollout. Empirical validation showed that the initial shared-page HTML is a client-rendered shell and does not contain the credential records needed for import.

If the undocumented endpoint changes, import must fail closed without changing confirmed application state. Future manual/PDF input or a supported Microsoft API can enter through the same reconciliation boundary without bypassing user confirmation.

Third-party CORS proxy services and arbitrary/general-purpose proxy behavior are not acceptable production paths.

## Current UI boundary

The PR #5 date-led UI remains the product baseline.

During the first import slice, browser-local imported records are intentionally not allowed to drive the existing next-action, 90-day schedule, credential register, calendar, or upcoming-event mock data until the required date/status projection logic is implemented and tested. This prevents partially implemented domain behavior from being presented as live credential state.

## Testing contract

Independent domain logic requires unit tests. The previous UI-only unit-test opt-out is no longer valid once transcript parsing and normalization are introduced.

Required gates are:

- `check`
- `typecheck`
- `test`
- `build`
- browser-rendered E2E
