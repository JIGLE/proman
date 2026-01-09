#!/usr/bin/env bash
set -euo pipefail

TAG=${1:-latest}

docker buildx create --use --name proman-builder || true
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/JIGLE/proman:${TAG} --push .
