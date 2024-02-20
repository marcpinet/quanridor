#!/bin/bash

# Navigate to your project directory
cd ~/ps8-24-quanridor/

# Pull the latest changes
git pull origin main

# Restart Docker containers
docker compose down && docker compose up --build -d
