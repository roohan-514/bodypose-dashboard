.PHONY: serve docker-build docker-up clean

serve:
	python -m http.server 8080

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	rm -rf node_modules/ .env

.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  serve        Start HTTP server on port 8080"
	@echo "  docker-build Build Docker image"
	@echo "  docker-up    Start Docker container"
	@echo "  docker-down  Stop Docker container"
	@echo "  clean        Remove temporary files"
