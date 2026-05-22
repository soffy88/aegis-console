#!/usr/bin/env bash
set -euo pipefail
if grep -rn --include="*.ts" --include="*.tsx" --include="*.md" -i "helixa" src/; then
    echo "ERROR: internal codename found in source — remove before committing"
    exit 1
fi
