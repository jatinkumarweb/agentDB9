.PHONY: help build build-vscode build-legacy up down restart logs clean prune

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all containers with BuildKit
	docker-compose build

build-vscode: ## Build VSCode container with legacy builder (workaround for BuildKit bug)
	@echo "Building VSCode with legacy builder to avoid BuildKit v0.24.0 bug..."
	DOCKER_BUILDKIT=0 docker build -t agentdb9-vscode:latest vscode/
	@echo "✅ VSCode container built successfully"

build-legacy: ## Build all containers with legacy builder
	@echo "Building all containers with legacy builder..."
	DOCKER_BUILDKIT=0 docker-compose build
	@echo "✅ All containers built successfully"

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## Show logs from all services
	docker-compose logs -f

clean: ## Remove all containers and volumes
	docker-compose down -v

prune: ## Prune Docker build cache
	docker builder prune -af
	docker system prune -f

health: ## Check health of all services
	@./scripts/check-services-health.sh || echo "Run 'make up' first to start services"
