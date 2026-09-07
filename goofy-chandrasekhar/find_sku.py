#!/usr/bin/env python3
"""Find the correct SKU name for a given model."""
import subprocess, json, sys

model_name = sys.argv[1] if len(sys.argv) > 1 else "gpt-5.5"
model_version = sys.argv[2] if len(sys.argv) > 2 else "2026-04-24"

result = subprocess.run(
    ["az", "cognitiveservices", "account", "list-models",
     "--name", "ahmedrady-0607-resource",
     "--resource-group", "VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236",
     "--output", "json"],
    capture_output=True, text=True
)

models = json.loads(result.stdout)
for m in models:
    if m.get("name") == model_name and m.get("version") == model_version:
        print(f"Model: {m['name']} {m['version']}")
        print(f"Status: {m.get('lifecycleStatus', '?')}")
        skus = m.get("skus", [])
        print("Available SKUs:")
        for sku in skus:
            print(f"  name={sku.get('name')} capacity={sku.get('capacity', {})}")
