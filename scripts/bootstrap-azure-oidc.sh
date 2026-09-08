#!/usr/bin/env bash

set -euo pipefail

readonly APP_DISPLAY_NAME="app-gha-azure-deployer"
readonly REPOSITORY="${1:-ShimaBell0619/ms-credentials-tracker}"
readonly FEDERATED_CREDENTIAL_NAME="${2:-ms-credentials-tracker-main}"
readonly CONTRIBUTOR_ROLE_ID="b24988ac-6180-42a0-ab88-20f7382dd24c"

subscription_id="$(az account show --query id --output tsv)"
tenant_id="$(az account show --query tenantId --output tsv)"
subscription_scope="/subscriptions/${subscription_id}"

app_object_id="$(az ad app list --display-name "${APP_DISPLAY_NAME}" --query '[0].id' --output tsv)"
if [[ -z "${app_object_id}" ]]; then
  app_object_id="$(az ad app create --display-name "${APP_DISPLAY_NAME}" --sign-in-audience AzureADMyOrg --query id --output tsv)"
fi

client_id="$(az ad app show --id "${app_object_id}" --query appId --output tsv)"
service_principal_object_id="$(az ad sp list --filter "appId eq '${client_id}'" --query '[0].id' --output tsv)"
if [[ -z "${service_principal_object_id}" ]]; then
  service_principal_object_id="$(az ad sp create --id "${client_id}" --query id --output tsv)"
fi

credential_id="$(az ad app federated-credential list --id "${app_object_id}" --query "[?name=='${FEDERATED_CREDENTIAL_NAME}'].id | [0]" --output tsv)"
if [[ -z "${credential_id}" ]]; then
  az ad app federated-credential create \
    --id "${app_object_id}" \
    --parameters "{\"name\":\"${FEDERATED_CREDENTIAL_NAME}\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:${REPOSITORY}:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"],\"description\":\"Main branch deployments for ${REPOSITORY}\"}" \
    --output none
fi

existing_assignment="$(az role assignment list \
  --assignee-object-id "${service_principal_object_id}" \
  --scope "${subscription_scope}" \
  --query "[?roleDefinitionId=='${subscription_scope}/providers/Microsoft.Authorization/roleDefinitions/${CONTRIBUTOR_ROLE_ID}'].id | [0]" \
  --output tsv)"
if [[ -z "${existing_assignment}" ]]; then
  az role assignment create \
    --assignee-object-id "${service_principal_object_id}" \
    --assignee-principal-type ServicePrincipal \
    --role "${CONTRIBUTOR_ROLE_ID}" \
    --scope "${subscription_scope}" \
    --output none
fi

printf 'AZURE_CLIENT_ID=%s\n' "${client_id}"
printf 'AZURE_TENANT_ID=%s\n' "${tenant_id}"
printf 'AZURE_SUBSCRIPTION_ID=%s\n' "${subscription_id}"
printf 'SERVICE_PRINCIPAL_OBJECT_ID=%s\n' "${service_principal_object_id}"
printf 'FEDERATED_SUBJECT=repo:%s:ref:refs/heads/main\n' "${REPOSITORY}"
