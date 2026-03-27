#!/bin/bash

# Math App - Deployment Script
# Развертывание приложения на VPS

set -e  # Exit on error

APP_DIR="$HOME/apps/math-app"

echo "================================="
echo "Math App Deployment"
echo "================================="
echo ""

# Проверка что мы в правильной директории
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "❌ Ошибка: Приложение не найдено в $APP_DIR"
    echo "Пожалуйста, сначала склонируйте репозиторий:"
    echo "  cd ~/apps"
    echo "  git clone YOUR_REPO_URL math-app"
    exit 1
fi

cd $APP_DIR

echo "📍 Директория: $APP_DIR"
echo ""

# Проверка .env файла
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚠️  Файл .env не найден!"
    echo ""
    read -p "Создать .env файл сейчас? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Создание .env файла..."
        cp .env.example .env
        echo ""
        echo "📝 Пожалуйста, отредактируйте .env файл:"
        echo "  nano $APP_DIR/.env"
        echo ""
        echo "Обязательно укажите:"
        echo "  - OPENAI_API_KEY"
        echo "  - ADMIN_TOKEN (используйте: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
        echo ""
        read -p "Нажмите Enter когда закончите редактирование..."
    else
        echo "❌ Развертывание отменено. Создайте .env файл и попробуйте снова."
        exit 1
    fi
fi

echo "1️⃣  Установка npm зависимостей..."
npm install --production

echo ""
echo "2️⃣  Создание необходимых директорий..."
mkdir -p database
mkdir -p public/uploads
mkdir -p logs

echo ""
echo "3️⃣  Проверка прав доступа..."
chmod 755 database
chmod 755 public/uploads

echo ""
echo "4️⃣  Создание конфигурации PM2..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'math-app',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

echo ""
echo "5️⃣  Запуск приложения через PM2..."
pm2 delete math-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "6️⃣  Настройка автозапуска PM2..."
pm2 startup | grep "sudo" | bash || true

echo ""
echo "7️⃣  Проверка статуса приложения..."
sleep 2
pm2 status

echo ""
echo "================================="
echo "✅ Приложение развернуто!"
echo "================================="
echo ""
echo "🔍 Проверка работоспособности:"
echo "  curl http://localhost:3000/health"
echo ""
curl -s http://localhost:3000/health | json_pp 2>/dev/null || curl http://localhost:3000/health
echo ""
echo ""
echo "📋 Полезные команды:"
echo "  pm2 status              - Статус приложения"
echo "  pm2 logs math-app       - Просмотр логов"
echo "  pm2 restart math-app    - Перезапуск"
echo "  pm2 monit               - Мониторинг"
echo ""
echo "📝 Следующий шаг: Настройте Nginx как reverse proxy"
echo "  Используйте скрипт: ./scripts/nginx-setup.sh"
echo ""
