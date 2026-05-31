#!/usr/bin/env bash
# scripts/helm-package — Package the ProMan Helm chart
# Usage: bash scripts/helm-package [output-dir]
#
# Examples:
#   bash scripts/helm-package                    # outputs to release-charts/
#   bash scripts/helm-package ./my-charts        # outputs to ./my-charts/

set -euo pipefail

OUTPUT_DIR="${1:-release-charts}"
CHART_DIR="helm/proman"

if ! command -v helm &> /dev/null; then
  echo "Error: helm is not installed. Install from https://helm.sh/docs/intro/install/"
  exit 1
fi

VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")

echo "Packaging Helm chart from ${CHART_DIR}..."
echo "  Version: ${VERSION}"
echo "  Output:  ${OUTPUT_DIR}/"

mkdir -p "${OUTPUT_DIR}"
helm package "${CHART_DIR}" -d "${OUTPUT_DIR}"

echo ""
echo "Done. Chart packaged at:"
ls -la "${OUTPUT_DIR}"/*.tgz 2>/dev/null || echo "  (no .tgz found)"
