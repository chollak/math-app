#!/bin/bash

# Тест для проверки правильности монтирования volumes

echo "=================================="
echo "Тест конфигурации Docker volumes"
echo "=================================="

# Создать директории
mkdir -p data/database data/public-images data/temp

# Создать тестовые файлы
echo "test" > data/database/test.txt
echo "test" > data/public-images/test.txt
echo "test" > data/temp/test.txt

# Запустить контейнер
echo "Запуск контейнера..."
docker-compose up -d

# Подождать
sleep 5

# Проверить пути внутри контейнера
echo ""
echo "Проверка путей внутри контейнера:"
echo "=================================="

docker-compose exec -T math-app sh -c "
echo '1. Структура /app/database:'
ls -la /app/database/ 2>/dev/null || echo 'Директория не найдена!'

echo ''
echo '2. Структура /app/public/images:'
ls -la /app/public/images/ 2>/dev/null || echo 'Директория не найдена!'

echo ''
echo '3. Структура /app/temp:'
ls -la /app/temp/ 2>/dev/null || echo 'Директория не найдена!'

echo ''
echo '4. Конфигурация storage из приложения:'
node -e \"const storage = require('./src/config/storage'); console.log('Database:', storage.databasePath); console.log('Uploads:', storage.uploadsPath); console.log('Public images:', storage.publicImagesPath); console.log('Temp:', storage.tempPath);\"

echo ''
echo '5. Проверка тестовых файлов:'
test -f /app/database/test.txt && echo '✓ /app/database/test.txt существует' || echo '✗ /app/database/test.txt НЕ НАЙДЕН'
test -f /app/public/images/test.txt && echo '✓ /app/public/images/test.txt существует' || echo '✗ /app/public/images/test.txt НЕ НАЙДЕН'
test -f /app/temp/test.txt && echo '✓ /app/temp/test.txt существует' || echo '✗ /app/temp/test.txt НЕ НАЙДЕН'
"

echo ""
echo "=================================="
echo "Тест завершён!"
echo "=================================="
