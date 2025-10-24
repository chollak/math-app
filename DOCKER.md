# Docker Setup для Math App

Быстрое руководство по запуску приложения с Docker.

## Быстрый старт

### Локальная разработка

1. **Создайте файл `.env`:**
```bash
cp .env.example .env
# Отредактируйте .env и добавьте свои ключи
```

2. **Создайте директории для данных:**
```bash
mkdir -p data/database data/public-images data/temp
```

3. **Запустите с помощью Docker Compose:**
```bash
docker-compose up -d
```

4. **Проверьте статус:**
```bash
docker-compose ps
docker-compose logs -f
```

5. **Откройте в браузере:**
```
http://localhost:3000
```

## Основные команды

```bash
# Запуск контейнеров
docker-compose up -d

# Остановка контейнеров
docker-compose down

# Просмотр логов
docker-compose logs -f

# Перезапуск
docker-compose restart

# Пересборка образа
docker-compose build --no-cache

# Проверка статуса
docker-compose ps

# Выполнение команд в контейнере
docker-compose exec math-app sh
```

## Структура данных

Все данные хранятся в директории `data/` и монтируются как volumes:

```
data/
├── database/          # База данных и загруженные файлы
│   ├── database.sqlite
│   └── uploads/
├── public-images/     # Публичные изображения
└── temp/             # Временные файлы
```

**Важно:** Эти директории не удаляются при перезапуске контейнеров!

## Production деплой

См. полное руководство в [DEPLOYMENT.md](./DEPLOYMENT.md)

## Порты

- `3000` - HTTP сервер приложения

## Переменные окружения

См. файл `.env.example` для списка всех доступных переменных.

Основные:
- `OPENAI_API_KEY` - API ключ OpenAI
- `ADMIN_TOKEN` - Токен для админ панели
- `PORT` - Порт сервера (по умолчанию 3000)
- `NODE_ENV` - Окружение (development/production)

## Troubleshooting

### Проблемы с правами доступа

```bash
# Дать права на директории с данными
chmod -R 755 data/
```

### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs

# Пересобрать образ
docker-compose build --no-cache
docker-compose up -d
```

### Очистка

```bash
# Удалить контейнеры и образы
docker-compose down --rmi all

# Удалить volumes (ВНИМАНИЕ: удалит все данные!)
docker-compose down -v
```

## Health Check

Приложение имеет встроенный health check:

```bash
curl http://localhost:3000/health
```

Ожидаемый ответ:
```json
{
  "status": "OK",
  "message": "Math App API is running",
  "database": "Connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
