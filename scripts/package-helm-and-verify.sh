#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=${1:-dist}
VERSION=${2:-}
CHART_DIR=helm/proman

mkdir -p "${OUT_DIR}"

if [ -n "${VERSION}" ]; then
  echo "Updating ${CHART_DIR}/Chart.yaml with version=${VERSION} and appVersion=${VERSION}"
  # Replace version and appVersion lines (if present)
  if grep -q "^version:" "${CHART_DIR}/Chart.yaml"; then
    sed -i "s/^version: .*$/version: ${VERSION}/" "${CHART_DIR}/Chart.yaml"
  else
    echo "version: ${VERSION}" >> "${CHART_DIR}/Chart.yaml"
  fi
  if grep -q "^appVersion:" "${CHART_DIR}/Chart.yaml"; then
    sed -i "s/^appVersion: .*$/appVersion: \"${VERSION}\"/" "${CHART_DIR}/Chart.yaml"
  else
    echo "appVersion: \"${VERSION}\"" >> "${CHART_DIR}/Chart.yaml"
  fi
fi

# Ensure helm is available
if ! command -v helm >/dev/null 2>&1; then
  echo "helm not found in PATH — attempting to download helm 3.12.0"
  curl -fsSL https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
  mv linux-amd64/helm /usr/local/bin/helm
fi

# Lint chart (will fail fast on obvious problems)
helm lint "${CHART_DIR}" || true

helm package "${CHART_DIR}" -d "${OUT_DIR}"

echo "Packaged helm chart into ${OUT_DIR}"

tgz=$(find "${OUT_DIR}" -type f -name 'proman-*.tgz' | head -n1 || true)
if [ -z "${tgz}" ]; then
  echo "ERROR: packaged chart not found in ${OUT_DIR}"; ls -la "${OUT_DIR}"; exit 1;
fi
if ! tar -tzf "${tgz}" | grep -q "Chart.yaml"; then
  echo "ERROR: packaged chart does not contain Chart.yaml"; tar -tzf "${tgz}" || true; exit 1;
fi

echo "Verified packaged chart ${tgz} contains Chart.yaml"

# Print tar contents for debugging
tar -tzf "${tgz}" | sed -n '1,200p'

exit 0
