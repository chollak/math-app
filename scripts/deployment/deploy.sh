#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Создать backup данных перед обновлением
if [ -d "data" ]; then
    echo "📦 Creating backup of current data..."
    cp -r data data_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "⚠️  Backup creation failed, continuing..."
fi

echo "🛑 Stopping current containers..."
# Остановить контейнеры
docker-compose down

echo "📁 Ensuring data directories exist..."
# Создать директории для данных
mkdir -p data/database data/public-images data/temp

echo "🔧 Checking environment configuration..."
# Создать .env если нет
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Copy .env.example to .env and fill it"
    exit 1
fi

echo "🐳 Building and starting containers..."
# Собрать и запустить
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for containers to start..."
# Проверить
sleep 5

echo "🔍 Checking deployment status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Deployment completed successfully!"
    echo "📊 Container status:"
    docker-compose ps
    
    # Проверить health check
    echo "🏥 Checking application health..."
    sleep 10
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Application is healthy and responding"
    else
        echo "⚠️  Application health check failed, but containers are running"
    fi
else
    echo "❌ Deployment failed!"
    echo "📋 Container logs:"
    docker-compose logs
    exit 1
fi
