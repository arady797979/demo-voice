#!/usr/bin/env python3
import subprocess, json, sys

result = subprocess.run(
    ["az", "cognitiveservices", "account", "list-models",
     "--name", "ahmedrady-0607-resource",
     "--resource-group", "VisualStudioOnline-B573F8EE1F904B1E8F122B898E62B236",
     "--output", "json"],
    capture_output=True, text=True
)

if result.returncode != 0:
    print("ERROR:", result.stderr)
    sys.exit(1)

models = json.loads(result.stdout)
print(f"{'Model Name':<30} {'Version':<25} {'Status'}")
print("-" * 75)
for m in sorted(models, key=lambda x: x.get("name", "")):
    name = m.get("name", "")
    if "gpt" not in name:
        continue
    version = m.get("version", "")
    status = m.get("lifecycleStatus", "unknown")
    print(f"{name:<30} {version:<25} {status}")
