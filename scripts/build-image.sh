#!/usr/bin/env bash
# scripts/build-image — Build the ProMan Docker image locally
# Usage: bash scripts/build-image [tag]
#
# Examples:
#   bash scripts/build-image              # builds proman:local
#   bash scripts/build-image 1.1.0        # builds proman:1.1.0

set -euo pipefail

TAG="${1:-local}"
IMAGE="proman:${TAG}"
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_VERSION="${TAG}"

echo "Building ${IMAGE}..."
echo "  GIT_COMMIT=${GIT_COMMIT}"
echo "  BUILD_TIME=${BUILD_TIME}"
echo "  BUILD_VERSION=${BUILD_VERSION}"

docker build \
  --build-arg BUILD_VERSION="${BUILD_VERSION}" \
  --build-arg GIT_COMMIT="${GIT_COMMIT}" \
  --build-arg BUILD_TIME="${BUILD_TIME}" \
  -t "${IMAGE}" \
  .

echo ""
echo "Done. Run with:"
echo "  docker run --rm -p 3000:3000 ${IMAGE}"
