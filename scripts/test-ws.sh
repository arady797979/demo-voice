#!/bin/bash
# Test WebSocket connectivity to Azure OpenAI Realtime
# Requires: wscat (npm install -g wscat) or websocat
ENDPOINT="https://ahmedrady-0607-resource.cognitiveservices.azure.com"
KEY="28R3UmG39XVqmtYe8DNwGJ6Uy7uUgWMZDELdCP0r4Wme5oxs6OD9JQQJ99CGACfhMk5XJ3w3AAAAACOGfj1N"
API_VER="2025-04-01-preview"

echo "=== Probing gpt-realtime-mini (HTTP upgrade check) ==="
curl -sv --no-buffer \
  -H "api-key: $KEY" \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "$ENDPOINT/openai/realtime?api-version=$API_VER&deployment=gpt-realtime-mini" \
  2>&1 | head -40

echo ""
echo "=== Probing gpt-realtime-2.1 (HTTP upgrade check) ==="
curl -sv --no-buffer \
  -H "api-key: $KEY" \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "$ENDPOINT/openai/realtime?api-version=$API_VER&deployment=gpt-realtime-2-2026-05-06" \
  2>&1 | head -40
