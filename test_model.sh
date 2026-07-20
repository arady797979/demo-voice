#!/bin/bash
source /mnt/c/Users/Administrator/Documents/antigravity/goofy-chandrasekhar/.env

echo "Testing deployment: $AZURE_OPENAI_DEPLOYMENT_NAME"
echo "Endpoint: $AZURE_OPENAI_ENDPOINT"
echo ""

curl -s -X POST \
  "${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}" \
  -H "Content-Type: application/json" \
  -H "api-key: ${AZURE_OPENAI_API_KEY}" \
  -d '{"messages":[{"role":"user","content":"Say hello in one sentence."}],"max_tokens":50}' | python3 -m json.tool
