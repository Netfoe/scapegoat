#!/bin/bash

# Create shared directory if it doesn't exist
mkdir -p shared

# Create empty .env and env-config.js if they don't exist to satisfy docker-compose
touch shared/.env
touch shared/env-config.js

echo "Environment prepared. You can now run: docker compose up --build"
