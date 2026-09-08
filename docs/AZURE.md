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

## Endpoint boundary

`POST /api/transcript` accepts JSON shaped as `{ "url": "..." }`. The URL is carried in the request body so normal request-target logs do not contain the Transcript share identifier.

The endpoint:

- only permits HTTPS `learn.microsoft.com` Transcript share paths
- removes query strings and fragments before retrieval
- rejects URL credentials and non-default ports
- resolves the fixed hostname and rejects private, loopback, link-local, reserved, and documentation addresses
- manually validates every redirect and refuses any redirect outside the same Transcript URL allowlist
- limits redirects to 3, the whole request to 8 seconds, and the response to 2 MiB
- only accepts HTML responses
- never writes the input URL or returned HTML to application logs
- returns CORS headers only for `https://shimabell0619.github.io`

The endpoint is anonymous because a Function key cannot be safely embedded in GitHub Pages. It is deliberately not a general-purpose proxy.

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

PR verification is performed with an authenticated local deployment while the branch is under review. This allows the Function implementation to be exercised before merge without widening the OIDC subject beyond `main`.

Manual equivalents:

```bash
az deployment sub validate --name mscred-validate --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
az deployment sub what-if --name mscred-deploy --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
az deployment sub create --name mscred-deploy --location japaneast --template-file infra/main.bicep --parameters infra/parameters/prod.bicepparam
```
