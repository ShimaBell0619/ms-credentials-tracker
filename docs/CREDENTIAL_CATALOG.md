# Credential Catalog Maintenance

The local credential catalog is application-owned metadata used to map Microsoft Learn Transcript records to stable `CredentialDefinition` IDs.

## Sources

Use Microsoft Learn first-party sources when adding or changing catalog entries:

- credential browse: https://learn.microsoft.com/credentials/browse/
- credential retirement: https://learn.microsoft.com/credentials/support/credential-retirement
- the credential's own Microsoft Learn page for title, exam relationship, and renewal behavior

Do not treat a search-engine snippet, exam code, credential URL, or display title as the application primary key.

## Entry rules

Each entry must keep:

- an immutable app-owned `id`;
- the Microsoft credential kind (`certification` or `appliedSkill`);
- the canonical current title;
- exact known Transcript aliases only;
- display/related exam codes as metadata;
- explicit validity policy.

Role-based and specialty certifications that use Microsoft's annual renewal model are represented as 12-month credentials with a 6-month renewal window. Fundamentals and Applied Skills are represented as non-expiring unless Microsoft changes the credential contract.

Retired credentials may remain in the catalog while existing user records still need to project or reconcile them. Retirement is not a reason to rewrite an already confirmed application identity.

## Matching rules

Automatic matching is intentionally exact after Unicode/whitespace normalization. Do not add fuzzy-title or exam-code-only auto-matching.

If an imported title is unknown, keep the candidate unresolved. The import review UI may let the user explicitly map that candidate to an existing catalog definition; that explicit choice is confirmation, not a new global alias.

## Change validation

Catalog changes should include tests for:

- canonical title matching;
- supported locale aliases;
- ambiguous/unknown titles staying unresolved;
- existing stored definition IDs remaining valid.

When Microsoft changes a title, prefer adding an exact alias while retaining the app-owned ID rather than replacing the ID.
