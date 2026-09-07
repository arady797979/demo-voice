#!/bin/bash
set -e

RG="VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236"
RESOURCE="ahmedrady-0607-resource"
DEPLOYMENT="gpt35-turbo-dev"
ENV_PATH="/mnt/c/Users/Administrator/Documents/antigravity/goofy-chandrasekhar/.env"

echo "🚀 Deploying gpt-35-turbo (version 1, GlobalStandard)..."
az cognitiveservices account deployment create \
  --resource-group "$RG" \
  --name "$RESOURCE" \
  --deployment-name "$DEPLOYMENT" \
  --model-name gpt-35-turbo \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name GlobalStandard \
  --sku-capacity 1

echo "✅ Deployment succeeded!"

echo ""
echo "🔑 Fetching endpoint and API key..."
ENDPOINT=$(az cognitiveservices account show \
  --name "$RESOURCE" \
  --resource-group "$RG" \
  --query "properties.endpoint" -o tsv)

KEY=$(az cognitiveservices account keys list \
  --name "$RESOURCE" \
  --resource-group "$RG" \
  --query "key1" -o tsv)

echo ""
echo "💾 Saving credentials to .env file..."
cat > "$ENV_PATH" <<EOF
# Azure OpenAI credentials - DO NOT commit this file to Git
AZURE_OPENAI_ENDPOINT=$ENDPOINT
AZURE_OPENAI_API_KEY=$KEY
AZURE_OPENAI_DEPLOYMENT_NAME=$DEPLOYMENT
AZURE_OPENAI_API_VERSION=2024-08-01-preview
EOF

echo "✅ Keys saved safely to $ENV_PATH"
echo ""
echo "--- Summary ---"
echo "Endpoint : $ENDPOINT"
echo "Deployment: $DEPLOYMENT"
echo "Key saved : YES (check .env file)"
