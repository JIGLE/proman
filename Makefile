SHELL := /bin/bash

.PHONY: build verify docker-build push

build:
	npm ci
	rm -rf .next
	npm run build

verify: build
	npm run verify:no-native

docker-build:
	docker buildx create --use --name proman-builder || true
	docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/jigle/proman:latest -t ghcr.io/jigle/proman:$(shell git rev-parse --short HEAD) --push .

push: docker-build
