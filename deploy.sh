#!/bin/bash

# Navigate to your project directory
cd ~/ps8-24-quanridor/

# Pull the latest changes
git pull origin main

# Stop and remove containers
docker-compose down

# Build and start containers
docker-compose up -d

# Remove unused images, containers, and volumes
docker system prune -f