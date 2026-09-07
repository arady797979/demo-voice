#!/usr/bin/env python3
import json, sys

data = json.load(sys.stdin)

print(f"{'Model':<45} {'Version':<30} {'SKUs'}")
print("-" * 100)
for item in data:
    m = item.get('model', item)  # handle both response structures
    name = m.get('name', '?')
    version = m.get('version', '?')
    skus = [s.get('name', '?') for s in m.get('skus', [])]
    print(f"{name:<45} {version:<30} {skus}")
