#!/usr/bin/env bash
set -euo pipefail

# Build the production image and save it to a tarball for import into TrueNAS SCALE
IMAGE_NAME=${1:-proman:local}
OUT=${2:-proman_local_image.tar}

echo "Building image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" .

echo "Saving image to ${OUT}..."
docker save "${IMAGE_NAME}" -o "${OUT}"

echo "Done. Upload ${OUT} to TrueNAS SCALE or load it on the target node with 'docker load -i ${OUT}'"
