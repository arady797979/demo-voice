#!/bin/bash
KEY="28R3UmG39XVqmtYe8DNwGJ6Uy7uUgWMZDELdCP0r4Wme5oxs6OD9JQQJ99CGACfhMk5XJ3w3AAAAACOGfj1N"
BASE="https://ahmedrady-0607-resource.cognitiveservices.azure.com/openai/realtime"

for dep in "gpt-realtime-2-1" "gpt-realtime" "gpt-4o-realtime-preview" "gpt-4o-realtime" "gpt-realtime-mini" "gpt-realtime-preview"; do
  echo -n "Testing deployment '$dep': "
  CODE=$(curl -s -o /tmp/ws_out.txt -w "%{http_code}" --http1.1 \
    -H "api-key: $KEY" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "${BASE}?api-version=2025-04-01-preview&deployment=${dep}")
  echo "HTTP $CODE — $(cat /tmp/ws_out.txt | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("error",{}).get("message","OK/WS"))' 2>/dev/null || echo 'WS upgrade or unexpected')"
done
