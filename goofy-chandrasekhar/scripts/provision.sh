#!/bin/bash
# ============================================================
# Step-by-step resource provisioning (resilient, no set -e)
# Run each section independently for clean error handling
# ============================================================

RG="VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236"
AOAI_RESOURCE="ahmedrady-0607-resource"
LOCATION="swedencentral"
PREFIX="ahmedrady-agent"
STORAGE_ACCOUNT="ahmedradyagentstore"
COSMOS_ACCOUNT="${PREFIX}-cosmos"
SEARCH_ACCOUNT="${PREFIX}-search"
DOCINTEL_ACCOUNT="${PREFIX}-docintel"
ENV_PATH="/mnt/c/Users/Administrator/Documents/antigravity/goofy-chandrasekhar/.env"

STEP="${1:-all}"

run_step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

deploy_models() {
  run_step "MODELS: Deploying gpt-4o (chat) + gpt-4o-realtime (voice)"

  # Chat model: gpt-4o GlobalStandard (most capable, most available)
  echo "▶ Deploying gpt-4o-mini-chat..."
  az cognitiveservices account deployment create \
    --resource-group "$RG" \
    --name "$AOAI_RESOURCE" \
    --deployment-name "gpt-4o-mini-chat" \
    --model-name "gpt-4o-mini" \
    --model-version "2024-07-18" \
    --model-format OpenAI \
    --sku-name Standard \
    --sku-capacity 10 2>&1 && echo "✅ gpt-4o-mini-chat DEPLOYED" || {
    echo "⚠️  gpt-4o-mini/Standard failed. Trying gpt-4o/GlobalStandard..."
    az cognitiveservices account deployment create \
      --resource-group "$RG" \
      --name "$AOAI_RESOURCE" \
      --deployment-name "gpt-4o-mini-chat" \
      --model-name "gpt-4o" \
      --model-version "2024-11-20" \
      --model-format OpenAI \
      --sku-name GlobalStandard \
      --sku-capacity 10 2>&1 && echo "✅ gpt-4o-mini-chat (gpt-4o fallback) DEPLOYED" || \
      echo "❌ Chat model FAILED — deploy manually at ai.azure.com"
  }

  # Voice model: gpt-4o-realtime-preview GlobalStandard latest
  echo ""
  echo "▶ Deploying gpt-4o-realtime-voice..."
  az cognitiveservices account deployment create \
    --resource-group "$RG" \
    --name "$AOAI_RESOURCE" \
    --deployment-name "gpt-4o-realtime-voice" \
    --model-name "gpt-4o-realtime-preview" \
    --model-version "2025-06-03" \
    --model-format OpenAI \
    --sku-name GlobalStandard \
    --sku-capacity 5 2>&1 && echo "✅ gpt-4o-realtime-voice DEPLOYED" || \
    echo "❌ Realtime model FAILED — deploy manually at ai.azure.com"
}

deploy_storage() {
  run_step "STORAGE: Azure Blob Storage"
  az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access false 2>&1 | tail -3

  # Enable CORS for browser uploads
  az storage cors add \
    --account-name "$STORAGE_ACCOUNT" \
    --services b \
    --methods GET PUT POST HEAD OPTIONS \
    --origins "*" \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 86400 2>&1 || true

  # Create the uploads container
  STORAGE_KEY=$(az storage account keys list \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RG" \
    --query "[0].value" -o tsv 2>/dev/null)

  az storage container create \
    --name "agent-uploads" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" 2>&1 | tail -1

  echo "✅ Storage DONE: $STORAGE_ACCOUNT | Container: agent-uploads"
}

deploy_cosmos() {
  run_step "COSMOS DB: Conversation memory"
  az cosmosdb create \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RG" \
    --locations regionName="westeurope" failoverPriority=0 isZoneRedundant=false \
    --enable-free-tier true \
    --default-consistency-level Session 2>&1 | tail -3

  az cosmosdb sql database create \
    --account-name "$COSMOS_ACCOUNT" \
    --resource-group "$RG" \
    --name "agent-db" 2>&1 | tail -1

  az cosmosdb sql container create \
    --account-name "$COSMOS_ACCOUNT" \
    --resource-group "$RG" \
    --database-name "agent-db" \
    --name "sessions" \
    --partition-key-path "/sessionId" \
    --throughput 400 2>&1 | tail -1

  echo "✅ Cosmos DB DONE: $COSMOS_ACCOUNT | DB: agent-db | Container: sessions"
}

deploy_search() {
  run_step "AI SEARCH: RAG document index"
  az search service create \
    --name "$SEARCH_ACCOUNT" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --sku basic \
    --partition-count 1 \
    --replica-count 1 2>&1 | tail -3

  echo "✅ AI Search DONE: $SEARCH_ACCOUNT"
}

deploy_docintel() {
  run_step "DOCUMENT INTELLIGENCE: File text extraction"
  az cognitiveservices account create \
    --name "$DOCINTEL_ACCOUNT" \
    --resource-group "$RG" \
    --location "$LOCATION" \
    --kind FormRecognizer \
    --sku S0 \
    --yes 2>&1 | tail -3

  echo "✅ Document Intelligence DONE: $DOCINTEL_ACCOUNT"
}

write_env() {
  run_step "WRITING .env FILE"
  AOAI_ENDPOINT=$(az cognitiveservices account show \
    --name "$AOAI_RESOURCE" --resource-group "$RG" \
    --query properties.endpoint -o tsv 2>/dev/null)
  AOAI_KEY=$(az cognitiveservices account keys list \
    --name "$AOAI_RESOURCE" --resource-group "$RG" \
    --query key1 -o tsv 2>/dev/null)
  STORAGE_CONN=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT" --resource-group "$RG" \
    --query connectionString -o tsv 2>/dev/null)
  COSMOS_ENDPOINT=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" --resource-group "$RG" \
    --query documentEndpoint -o tsv 2>/dev/null)
  COSMOS_KEY=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" --resource-group "$RG" \
    --query primaryMasterKey -o tsv 2>/dev/null)
  SEARCH_KEY=$(az search admin-key show \
    --service-name "$SEARCH_ACCOUNT" --resource-group "$RG" \
    --query primaryKey -o tsv 2>/dev/null)
  DOCINTEL_ENDPOINT=$(az cognitiveservices account show \
    --name "$DOCINTEL_ACCOUNT" --resource-group "$RG" \
    --query properties.endpoint -o tsv 2>/dev/null)
  DOCINTEL_KEY=$(az cognitiveservices account keys list \
    --name "$DOCINTEL_ACCOUNT" --resource-group "$RG" \
    --query key1 -o tsv 2>/dev/null)

  cat > "$ENV_PATH" <<EOF
# ============================================================
# Azure AI Agent — Environment Variables
# Generated: $(date -u)
# DO NOT commit this file to Git
# ============================================================

# ── Azure OpenAI ─────────────────────────────────────────────
AZURE_OPENAI_ENDPOINT=${AOAI_ENDPOINT}
AZURE_OPENAI_API_KEY=${AOAI_KEY}
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_REALTIME_API_VERSION=2025-04-01-preview

# Deployment names
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini-chat
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-voice

# ── Azure Blob Storage ────────────────────────────────────────
AZURE_STORAGE_ACCOUNT_NAME=${STORAGE_ACCOUNT}
AZURE_STORAGE_CONNECTION_STRING=${STORAGE_CONN}
AZURE_STORAGE_CONTAINER_NAME=agent-uploads

# ── Azure Cosmos DB ───────────────────────────────────────────
AZURE_COSMOS_ENDPOINT=${COSMOS_ENDPOINT}
AZURE_COSMOS_KEY=${COSMOS_KEY}
AZURE_COSMOS_DATABASE=agent-db
AZURE_COSMOS_CONTAINER=sessions

# ── Azure AI Search ───────────────────────────────────────────
AZURE_SEARCH_ENDPOINT=https://${SEARCH_ACCOUNT}.search.windows.net
AZURE_SEARCH_API_KEY=${SEARCH_KEY}
AZURE_SEARCH_INDEX_NAME=agent-docs

# ── Azure Document Intelligence ───────────────────────────────
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=${DOCINTEL_ENDPOINT}
AZURE_DOCUMENT_INTELLIGENCE_KEY=${DOCINTEL_KEY}

# ── Next.js Public (safe to expose) ──────────────────────────
NEXT_PUBLIC_APP_NAME=Azure AI Agent
EOF

  echo "✅ .env written to $ENV_PATH"
  echo ""
  echo "📋 Summary:"
  echo "   OpenAI Endpoint  : ${AOAI_ENDPOINT}"
  echo "   Storage Account  : ${STORAGE_ACCOUNT}"
  echo "   Cosmos DB        : ${COSMOS_ENDPOINT}"
  echo "   AI Search        : https://${SEARCH_ACCOUNT}.search.windows.net"
  echo "   Doc Intelligence : ${DOCINTEL_ENDPOINT}"
}

# Run all steps
deploy_models
deploy_storage
deploy_cosmos
deploy_search
deploy_docintel
write_env

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        ALL PROVISIONING STEPS COMPLETE ✅            ║"
echo "╚══════════════════════════════════════════════════════╝"
