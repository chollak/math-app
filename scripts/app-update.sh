#!/bin/bash

# Math App - Update Script
# Обновление приложения из Git репозитория

set -e  # Exit on error

APP_DIR="$HOME/apps/math-app"

echo "================================="
echo "Math App Update"
echo "================================="
echo ""

# Проверка что приложение существует
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Ошибка: Приложение не найдено в $APP_DIR"
    exit 1
fi

cd $APP_DIR

echo "📍 Директория: $APP_DIR"
echo ""

# Проверка Git репозитория
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Это не Git репозиторий"
    exit 1
fi

echo "1️⃣  Создание backup базы данных..."
if [ -f "database/database.sqlite" ]; then
    DATE=$(date +%Y%m%d_%H%M%S)
    mkdir -p database/backups
    cp database/database.sqlite database/backups/pre_update_$DATE.sqlite
    echo "✅ Backup создан: database/backups/pre_update_$DATE.sqlite"
else
    echo "⚠️  База данных не найдена, backup пропущен"
fi

echo ""
echo "2️⃣  Проверка текущей версии..."
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "Branch: $CURRENT_BRANCH"
echo "Commit: $CURRENT_COMMIT"

echo ""
echo "3️⃣  Получение обновлений из репозитория..."
git fetch origin

# Проверка есть ли обновления
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "✅ Приложение уже обновлено до последней версии"
    exit 0
fi

echo "📥 Найдены обновления, загрузка..."

# Сохранить локальные изменения если есть
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Обнаружены локальные изменения, сохранение..."
    git stash save "Auto-stash before update $(date)"
fi

git pull origin $CURRENT_BRANCH

NEW_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Обновлено до commit: $NEW_COMMIT"

echo ""
echo "4️⃣  Обновление npm зависимостей..."
npm install --production

echo ""
echo "5️⃣  Перезапуск приложения..."
pm2 restart math-app

echo ""
echo "6️⃣  Ожидание запуска (5 секунд)..."
sleep 5

echo ""
echo "7️⃣  Проверка статуса..."
pm2 status math-app

echo ""
echo "8️⃣  Проверка работоспособности..."
if curl -sf http://localhost:3000/health > /dev/null; then
    echo "✅ Приложение работает корректно"
    curl -s http://localhost:3000/health | json_pp 2>/dev/null || curl http://localhost:3000/health
else
    echo "❌ Ошибка: Приложение не отвечает!"
    echo ""
    echo "Проверьте логи:"
    echo "  pm2 logs math-app --lines 50"
    exit 1
fi

echo ""
echo "================================="
echo "✅ Обновление завершено!"
echo "================================="
echo ""
echo "📊 Изменения:"
echo "  Старая версия: $CURRENT_COMMIT"
echo "  Новая версия:  $NEW_COMMIT"
echo ""
echo "📋 Посмотреть изменения:"
echo "  git log --oneline $CURRENT_COMMIT..$NEW_COMMIT"
echo ""
echo "📝 В случае проблем откатить обновление:"
echo "  git reset --hard $CURRENT_COMMIT"
echo "  npm install --production"
echo "  pm2 restart math-app"
echo ""
