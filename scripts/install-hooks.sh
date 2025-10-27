#!/bin/bash

# Скрипт для установки Git hooks для команды разработки
# Автоматически устанавливает pre-commit hook для синхронизации Postman коллекции

echo "🔧 Устанавливаем Git hooks для Math App..."

# Проверяем, что мы в git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Не найдена папка .git. Запустите скрипт из корня проекта."
    exit 1
fi

# Проверяем наличие файла hook'а
if [ ! -f "scripts/hooks/pre-commit" ]; then
    echo "❌ Ошибка: Не найден файл scripts/hooks/pre-commit"
    exit 1
fi

# Создаем резервную копию существующего hook'а (если есть)
if [ -f ".git/hooks/pre-commit" ]; then
    echo "📦 Создаем резервную копию существующего pre-commit hook..."
    cp .git/hooks/pre-commit .git/hooks/pre-commit.backup.$(date +%Y%m%d_%H%M%S)
fi

# Копируем наш hook
echo "📋 Устанавливаем pre-commit hook..."
cp scripts/hooks/pre-commit .git/hooks/pre-commit

# Делаем его исполняемым
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks успешно установлены!"
echo ""
echo "🎯 Что делает pre-commit hook:"
echo "   • Работает только в ветке 'main'"
echo "   • Автоматически обновляет Postman коллекцию при изменении API"
echo "   • Добавляет обновленную коллекцию в коммит"
echo ""
echo "🚀 Готово! Теперь при коммитах в main Postman коллекция будет автоматически синхронизироваться."