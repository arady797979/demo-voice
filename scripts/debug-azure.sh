#!/bin/bash
ENDPOINT="https://ahmedrady-0607-resource.cognitiveservices.azure.com"
KEY="28R3UmG39XVqmtYe8DNwGJ6Uy7uUgWMZDELdCP0r4Wme5oxs6OD9JQQJ99CGACfhMk5XJ3w3AAAAACOGfj1N"
API_VER="2025-01-01-preview"

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
