#!/bin/bash
KEY="28R3UmG39XVqmtYe8DNwGJ6Uy7uUgWMZDELdCP0r4Wme5oxs6OD9JQQJ99CGACfhMk5XJ3w3AAAAACOGfj1N"
BASE="https://ahmedrady-0607-resource.cognitiveservices.azure.com/openai/realtime"
DEP="gpt-realtime-2-1"

for ver in "2025-04-01-preview" "2025-06-01-preview" "2025-05-01-preview" "2025-07-01-preview" "2025-01-01-preview" "2024-12-01-preview" "2024-10-01-preview"; do
  CODE=$(curl -s -o /tmp/ws_out.txt -w "%{http_code}" --max-time 8 --http1.1 \
    -H "api-key: $KEY" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "${BASE}?api-version=${ver}&deployment=${DEP}")
  BODY=$(cat /tmp/ws_out.txt | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message','OK/WS-CONNECTED'))" 2>/dev/null || echo "WS-CONNECTED or non-JSON")
  echo "API ver $ver → HTTP $CODE — $BODY"
done
