# Руководство по запуску импорта через Docker

## 📋 Подготовка файла для импорта

✅ **Файл уже включен в проект!**
Файл `output_clean.json` находится в папке `scripts/` и будет доступен на сервере после обновления кода.

Если нужно использовать другой файл:
```bash
# Скопируйте ваш JSON файл в папку scripts на сервере
scp your_file.json user@server:/var/www/math-app/scripts/output_clean.json
```

## 🐳 Запуск импорта через Docker

### Вариант 1: Через docker-compose exec (рекомендуется)

```bash
# На сервере в папке проекта (/var/www/math-app)
cd /var/www/math-app

# Запуск скрипта импорта в существующем контейнере
docker-compose exec math-app node scripts/import-clean-json.js
```

### Вариант 2: Через docker exec

```bash
# Найти ID контейнера
docker ps | grep math-app

# Запустить скрипт в контейнере
docker exec -it math-app node scripts/import-clean-json.js
```

### Вариант 3: Одноразовый контейнер

```bash
# Запуск нового контейнера для импорта
docker-compose run --rm math-app node scripts/import-clean-json.js
```

## 📍 Пути в Docker контейнере

В контейнере файловая система выглядит так:
- **База данных**: `/app/database/database.sqlite` (монтируется из `./data/database/`)
- **Uploads**: `/app/database/uploads/` (монтируется из `./data/database/uploads/`)
- **Импорт файл**: `/app/scripts/output_clean.json` ✅ (включен в код)
- **Скрипты**: `/app/scripts/`

## 🔍 Проверка состояния

### Проверить логи импорта:
```bash
# Просмотр логов контейнера
docker-compose logs -f math-app
```

### Проверить базу данных после импорта:
```bash
# Войти в контейнер
docker-compose exec math-app sh

# Внутри контейнера проверить базу
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/app/database/database.sqlite');
db.get('SELECT COUNT(*) as count FROM questions', (err, row) => {
  console.log('Всего вопросов:', row.count);
  db.close();
});
"
```

### Проверить размер базы:
```bash
# На хосте
ls -lh data/database/database.sqlite

# В контейнере  
docker-compose exec math-app ls -lh /app/database/database.sqlite
```

## ⚠️ Важные моменты

1. **Резервная копия**: Скрипт автоматически создает резервную копию в `/app/backups/`
2. **Дубликаты**: Скрипт пропускает дубликаты и показывает статистику
3. **Монтирование**: Убедитесь, что `./data/database/` существует на хосте
4. **Права доступа**: Файлы должны принадлежать пользователю `nodejs` (UID 1001)

## 🛠️ Устранение проблем

### Проблема: "Файл не найден"
```bash
# Проверить наличие файла в контейнере
docker-compose exec math-app ls -la /app/temp/

# Скопировать файл в контейнер если нужно
docker cp temp/output_clean.json math-app:/app/temp/
```

### Проблема: "База данных заблокирована"
```bash
# Остановить приложение перед импортом
docker-compose stop math-app

# Запустить импорт в одноразовом контейнере
docker-compose run --rm math-app node scripts/import-clean-json.js

# Запустить приложение обратно
docker-compose start math-app
```

### Проблема: "Нет прав доступа"
```bash
# Исправить права на хосте
sudo chown -R 1001:1001 data/database/
sudo chmod -R 755 data/database/
```

## 📊 Мониторинг процесса

```bash
# Следить за логами в реальном времени
docker-compose logs -f math-app | grep -E "(импорт|import|error|success)"

# Проверить использование ресурсов
docker stats math-app
```