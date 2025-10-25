#!/bin/bash

# Deploy script for VPS server
# This script pulls the latest code and restarts Docker containers

set -e  # Exit on error

echo "=================================="
echo "Starting deployment..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running!${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed!${NC}"
    exit 1
fi

# Stop containers
echo -e "${YELLOW}Stopping containers...${NC}"
docker-compose down

# Pull latest changes from git
echo -e "${YELLOW}Pulling latest changes from git...${NC}"
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git reset --hard origin/$BRANCH

# Create data directories if they don't exist
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p data/database data/public-images data/temp

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Warning: .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Please update .env file with your configuration!${NC}"
    else
        echo -e "${RED}Error: .env.example not found!${NC}"
        exit 1
    fi
fi

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker-compose build --no-cache

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Wait for container to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}Container is running!${NC}"
else
    echo -e "${RED}Error: Container failed to start!${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# Health check
echo -e "${YELLOW}Running health check...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}Health check passed!${NC}"
else
    echo -e "${RED}Health check failed! Status code: $HEALTH_RESPONSE${NC}"
    echo -e "${YELLOW}Container logs:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# Clean up old images
echo -e "${YELLOW}Cleaning up old Docker images...${NC}"
docker image prune -f

# Show container status
echo ""
echo -e "${GREEN}=================================="
echo "Deployment completed successfully!"
echo "==================================${NC}"
echo ""
echo "Container status:"
docker-compose ps
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To restart: docker-compose restart"
