#!/bin/bash
# ============================================================
# Azure AI Agent - Full Environment Audit & Setup Script
# ============================================================
set -e

RG="VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236"
RESOURCE="ahmedrady-0607-resource"
LOCATION="swedencentral"

echo "============================================="
echo " STEP 1: Current Subscription & Resource Info"
echo "============================================="
az account show --query "{Subscription:name, User:user.name, Tenant:tenantDefaultDomain}" -o table

echo ""
echo "============================================="
echo " STEP 2: Existing Deployments"
echo "============================================="
az cognitiveservices account deployment list -g "$RG" -n "$RESOURCE" \
  --query "[].{Name:name, Model:properties.model.name, Version:properties.model.version, State:properties.provisioningState}" \
  -o table

echo ""
echo "============================================="
echo " STEP 3: Available Realtime Models in Region"
echo "============================================="
az cognitiveservices account list-models -g "$RG" -n "$RESOURCE" -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'{'Model':<40} {'Version':<30} {'SKUs':<30}')
print('-' * 100)
for m in data:
    name = m['model']['name']
    version = m['model']['version']
    skus = [s['name'] for s in m['model'].get('skus', [])]
    if any(x in name.lower() for x in ['realtime', 'gpt-4o', 'gpt-4.1']):
        print(f'{name:<40} {version:<30} {str(skus):<30}')
"

echo ""
echo "============================================="
echo " STEP 4: Existing Azure Resources in RG"
echo "============================================="
az resource list -g "$RG" \
  --query "[].{Name:name, Type:type, Location:location, State:properties.provisioningState}" \
  -o table

echo ""
echo "============================================="
echo " STEP 5: Check Cosmos DB Free Tier Available"
echo "============================================="
az cosmosdb list --query "[].{Name:name, Location:location, FreeTier:properties.enableFreeTier}" -o table 2>/dev/null || echo "No Cosmos DB accounts found"

echo ""
echo "============================================="
echo " STEP 6: Check Storage Accounts"
echo "============================================="
az storage account list --query "[].{Name:name, Location:location, Kind:kind}" -o table 2>/dev/null || echo "No storage accounts found"

echo ""
echo "AUDIT COMPLETE"
