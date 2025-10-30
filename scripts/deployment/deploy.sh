#!/bin/bash
set -e

echo "Deploying..."

# Остановить контейнеры
docker-compose down

# Создать директории для данных
mkdir -p data/database data/public-images data/temp

# Создать .env если нет
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Copy .env.example to .env and fill it"
    exit 1
fi

# Собрать и запустить
docker-compose build
docker-compose up -d

# Проверить
sleep 5
if docker-compose ps | grep -q "Up"; then
    echo "✓ Deployed successfully!"
    docker-compose ps
else
    echo "✗ Deployment failed!"
    docker-compose logs
    exit 1
fi
