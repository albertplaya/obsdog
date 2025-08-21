# Variables
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = obs-dev

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

# Docker Compose commands
.PHONY: up
up: ## Start all services
	docker-compose -f $(COMPOSE_FILE) up -d

.PHONY: down
down: ## Stop all services
	docker-compose -f $(COMPOSE_FILE) down

.PHONY: restart
restart: ## Restart all services
	$(MAKE) down
	$(MAKE) up

.PHONY: logs
logs: ## Show logs from all services
	docker-compose -f $(COMPOSE_FILE) logs -f

.PHONY: logs-devobs
logs-devobs: ## Show logs from devobs service
	docker-compose -f $(COMPOSE_FILE) logs -f devobs

.PHONY: logs-server-test
logs-server-test: ## Show logs from server-test service
	docker-compose -f $(COMPOSE_FILE) logs -f server-test

# Build commands
.PHONY: build
build: ## Build all services
	docker-compose -f $(COMPOSE_FILE) build

.PHONY: build-devobs
build-devobs: ## Build devobs service
	docker-compose -f $(COMPOSE_FILE) build devobs

.PHONY: build-server-test
build-server-test: ## Build server-test service
	docker-compose -f $(COMPOSE_FILE) build server-test

# Service-specific commands
.PHONY: up-devobs
up-devobs: ## Start only devobs service
	docker-compose -f $(COMPOSE_FILE) up -d devobs

.PHONY: up-server-test
up-server-test: ## Start only server-test service
	docker-compose -f $(COMPOSE_FILE) up -d server-test

.PHONY: stop-devobs
stop-devobs: ## Stop only devobs service
	docker-compose -f $(COMPOSE_FILE) stop devobs

.PHONY: stop-server-test
stop-server-test: ## Stop only server-test service
	docker-compose -f $(COMPOSE_FILE) stop server-test

# Development commands
.PHONY: dev
dev: ## Start services in development mode with logs
	docker-compose -f $(COMPOSE_FILE) up

.PHONY: dev-server-test
dev-server-test: ## Start server-test in development mode
	cd server-test && npm run dev

.PHONY: dev-devobs
dev-devobs: ## Start devobs in development mode
	cd server && npm run dev
	cd web && npm run dev

# Cleanup commands
.PHONY: clean
clean: ## Remove all containers, networks, and volumes
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans

.PHONY: clean-images
clean-images: ## Remove all images
	docker-compose -f $(COMPOSE_FILE) down --rmi all

.PHONY: prune
prune: ## Remove unused Docker resources
	docker system prune -f

# Status commands
.PHONY: status
status: ## Show status of all services
	docker-compose -f $(COMPOSE_FILE) ps

.PHONY: ps
ps: ## Alias for status
	$(MAKE) status

# Utility commands
.PHONY: shell-devobs-backend
shell-devobs-backend: ## Open shell in devobs container
	docker-compose -f $(COMPOSE_FILE) exec devobs-backend sh	

.PHONY: shell-server-test
shell-server-test: ## Open shell in server-test container
	docker-compose -f $(COMPOSE_FILE) exec server-test sh

.PHONY: install-deps
install-deps: ## Install dependencies for all services
	cd server && npm install
	cd server-test && npm install
	cd web && npm install

# Quick start for development
.PHONY: quick-start
quick-start: ## Quick start: build and run all services
	$(MAKE) build
	$(MAKE) up
	@echo "$(GREEN)Services are starting up...$(NC)"
	@echo "$(YELLOW)DevObs Server: http://localhost
	@echo "$(YELLOW)DevObs UI: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Server Test: http://localhost:8080/hello$(NC)"
