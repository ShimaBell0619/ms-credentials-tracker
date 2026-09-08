targetScope = 'subscription'

@description('Azure region for all application resources.')
param location string = 'japaneast'

@description('Production resource group name.')
param resourceGroupName string = 'rg-mscred-prod-jpe-01'

@description('Globally unique Function App name.')
param functionAppName string = 'func-mscred-transcript-prod-jpe-01'

@description('Globally unique storage account name.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('GitHub Pages origin allowed to call the Transcript endpoint.')
param allowedOrigin string = 'https://shimabell0619.github.io'

var tags = {
  application: 'ms-credentials-tracker'
  environment: 'production'
  managedBy: 'bicep'
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module functionResources './function-app.bicep' = {
  name: 'transcript-function-resources'
  scope: resourceGroup
  params: {
    location: location
    functionAppName: functionAppName
    storageAccountName: storageAccountName
    allowedOrigin: allowedOrigin
    tags: tags
  }
}

output functionAppName string = functionResources.outputs.functionAppName
output transcriptApiUrl string = functionResources.outputs.transcriptApiUrl
output resourceGroupName string = resourceGroup.name
