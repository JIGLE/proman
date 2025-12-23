#!/usr/bin/env bash
set -euo pipefail

# Package the Helm chart into the dist/ directory
OUT_DIR=${1:-dist}
mkdir -p "${OUT_DIR}"
helm package helm/proman -d "${OUT_DIR}"
echo "Packaged helm chart into ${OUT_DIR}"
