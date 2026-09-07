#!/bin/bash
# Find available GPT models with their valid SKUs
RG="VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236"
RESOURCE="ahmedrady-0607-resource"

echo "Fetching available models and their SKUs..."
az cognitiveservices account list-models \
  -g "$RG" \
  -n "$RESOURCE" \
  -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data:
    name = m['model']['name']
    version = m['model']['version']
    skus = [s['name'] for s in m['model'].get('skus', [])]
    if 'gpt' in name.lower():
        print(f'{name:35} {version:30} SKUs: {skus}')
"
