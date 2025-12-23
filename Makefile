.PHONY: build-image save-image package-helm

build-image:
	docker build -t proman:local .

save-image: build-image
	docker save -o proman_local_image.tar proman:local

package-helm:
	./scripts/package-helm.sh dist
