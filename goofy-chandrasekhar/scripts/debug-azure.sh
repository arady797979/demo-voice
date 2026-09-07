#!/bin/bash
# Load environment variables from .env if present
if [ -f "$(dirname "$0")/../.env" ]; then
  source "$(dirname "$0")/../.env"
fi

ENDPOINT="${AZURE_ENDPOINT:?'AZURE_ENDPOINT is not set. Copy .env.example to .env and fill in your values.'}"
KEY="${AZURE_API_KEY:?'AZURE_API_KEY is not set. Copy .env.example to .env and fill in your values.'}"
API_VER="${AZURE_API_VERSION:-2025-01-01-preview}"

echo "=== Testing aria-chat (chat) ==="
curl -s -w "\nHTTP:%{http_code}\n" \
  "$ENDPOINT/openai/deployments/aria-chat/chat/completions?api-version=$API_VER" \
  -H "api-key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":5}'

echo ""
echo "=== Testing gpt-realtime-2-1 (realtime HTTP probe) ==="
curl -s -w "\nHTTP:%{http_code}\n" \
  "$ENDPOINT/openai/deployments/gpt-realtime-2-1/realtime?api-version=2025-04-01-preview" \
  -H "api-key: $KEY"

echo ""
echo "=== Testing gpt-realtime-mini (realtime HTTP probe) ==="
curl -s -w "\nHTTP:%{http_code}\n" \
  "$ENDPOINT/openai/deployments/gpt-realtime-mini/realtime?api-version=2025-04-01-preview" \
  -H "api-key: $KEY"

echo ""
echo "=== Available models list ==="
curl -s "$ENDPOINT/openai/models?api-version=$API_VER" -H "api-key: $KEY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    for m in data['data']:
        print(m.get('id'), '-', m.get('lifecycle_status',''))
else:
    print(json.dumps(data, indent=2))
"
