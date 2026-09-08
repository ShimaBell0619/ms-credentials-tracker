# Azure Transcript Function

## Production resources

The production stack is managed by `infra/main.bicep` and `infra/function-app.bicep` at subscription scope:

- resource group: `rg-mscred-prod-jpe-01`
- Function App: `func-mscred-transcript-prod-jpe-01`
- Flex Consumption plan: `asp-mscred-transcript-prod-jpe-01`
- storage account: `stmscredprodjpe01`
- region: Japan East
- runtime: Linux, Node.js 24
- instance memory: 512 MB
- always-ready instances: 0 (the Flex Consumption default; no always-ready group is configured)

The Function's system-assigned managed identity accesses its host/deployment storage through Azure RBAC. Storage shared-key access and public blob access are disabled.

## Transcript transport boundary

`POST /api/transcript` accepts JSON shaped as `{ "url": "..." }`. The user-supplied Transcript share URL is carried in the request body so normal request-target logs do not contain the share identifier.

The Function does **not** fetch an arbitrary URL and does not proxy the browser-visible Transcript page. After validating the official share URL, it extracts only the share identifier and constructs this fixed Microsoft Learn request internally:

```text
https://learn.microsoft.com/api/profiles/transcript/share/{share-id}?locale=en-us
```

The `locale=en-us` parameter keeps field/value presentation consistent with the parser boundary. The Function returns the validated JSON payload to the calling browser as the `content` property. It does not log or persist the share URL, share identifier, returned JSON, credential names, or profile fields.

The endpoint:

- only accepts HTTPS `learn.microsoft.com` Transcript share paths as user input
- removes query strings and fragments before extracting the share identifier
- rejects URL credentials and non-default ports
- never accepts a caller-provided upstream API URL
- resolves the fixed `learn.microsoft.com` hostname and rejects private, loopback, link-local, reserved, and documentation addresses
- refuses unexpected redirects instead of following them
- limits the whole request to 8 seconds and the response to 2 MiB
- only accepts JSON responses and verifies that the response body is valid JSON
- never writes input URLs or upstream bodies to application logs
- returns CORS headers only for `https://shimabell0619.github.io`

The endpoint is anonymous because a Function key cannot be safely embedded in GitHub Pages. The fixed upstream construction and strict share-URL validation are therefore important parts of the security boundary.

## Undocumented Microsoft Learn dependency

The `/api/profiles/transcript/share/{share-id}` endpoint is an observed Microsoft Learn implementation detail, not a documented public Microsoft API contract. It is used as a best-effort transport for this personal MVP because the official shared Transcript page is public but its initial HTML response contains only a client-rendered shell.

The application must treat this dependency as replaceable:

- parsing/normalization remains behind a source adapter
- imported data still requires explicit user confirmation
- browser-local application state is not silently overwritten when the endpoint changes or fails
- a future manual/PDF input path can remain available without changing the credential domain model

Do not promote this endpoint to a general Microsoft Learn synchronization contract unless Microsoft publishes a supported API for that purpose.

## GitHub Actions OIDC bootstrap

The reusable Entra application/service principal is named `app-gha-azure-deployer`. No client secret is created.

This repository adds one standard Federated Identity Credential:

```text
issuer:  https://token.actions.githubusercontent.com
subject: repo:ShimaBell0619/ms-credentials-tracker:ref:refs/heads/main
audience: api://AzureADTokenExchange
```

The service principal has `Contributor` at the subscription scope. It does not have `Owner` or `User Access Administrator`. The branch-specific subject ensures pull requests and arbitrary branches cannot obtain this subscription-wide identity.

Repository Variables (not Secrets) provide:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `VITE_TRANSCRIPT_API_URL`

For a future repository, run `scripts/bootstrap-azure-oidc.sh owner/repository credential-name`. The idempotent script reuses the existing app registration and adds one repository-specific, main-branch Federated Identity Credential; it does not create another service principal.

## Deployment workflow

`.github/workflows/azure-functions.yml` only runs from `main` (`push` or a manual dispatch of the workflow present on `main`). It performs Azure Resource Manager validation, what-if, infrastructure deployment, Function build, and Function package deployment in that order.

PR verification is performed without widening the OIDC subject beyond `main`. A PR build can fully test the Function logic with mocked upstream responses, but a real Azure deployment of unmerged Function code requires an explicitly authenticated operator session.

Manual infrastructure equivalents:

```bash
az deployment sub validate --name mscred-validate --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
az deployment sub what-if --name mscred-deploy --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
az deployment sub create --name mscred-deploy --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
```
