#!/bin/bash

# Navigate to your project directory
cd ~/quanridor/

# Pull the latest changes
git pull origin main

# Restart Docker containers
docker compose down && docker compose up --build -d
