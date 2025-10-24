# Math App

REST API для управления математическими вопросами с поддержкой контекстов, подвопросов и файлов.

## Возможности

- Создание и управление вопросами с несколькими вариантами ответов
- Поддержка контекстов для вопросов
- Загрузка изображений для вопросов и контекстов
- Многоязычность (русский и казахский)
- SQLite база данных
- REST API

## Быстрый старт

### С Docker (рекомендуется)

```bash
# Создать .env файл
cp .env.example .env

# Запустить с Docker Compose
docker-compose up -d

# Проверить статус
curl http://localhost:3000/health
```

См. [DOCKER.md](./DOCKER.md) для подробностей.

### Без Docker

```bash
# Установить зависимости
npm install

# Создать .env файл
cp .env.example .env

# Запустить
npm start
```

## Документация

- [Руководство по Docker](./DOCKER.md) - запуск с Docker
- [Руководство по развертыванию](./DEPLOYMENT.md) - полное руководство по деплою на VPS с CI/CD
- [План проекта](./PROJECT_PLAN.md) - техническая документация

## Деплой на VPS

Этот проект включает полную настройку CI/CD для автоматического развертывания на VPS при push в главную ветку.

**Быстрая установка на сервер:**

```bash
# На VPS сервере
curl -O https://raw.githubusercontent.com/yourusername/math-app/main/scripts/deployment/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

См. [DEPLOYMENT.md](./DEPLOYMENT.md) для подробных инструкций.

## API Endpoints

```
GET  /health              - Health check
GET  /config              - Конфигурация для фронтенда

POST   /api/questions     - Создать вопрос
GET    /api/questions     - Получить все вопросы
GET    /api/questions/:id - Получить вопрос по ID

POST   /api/contexts      - Создать контекст
GET    /api/contexts      - Получить все контексты
GET    /api/contexts/:id  - Получить контекст по ID
PUT    /api/contexts/:id  - Обновить контекст
DELETE /api/contexts/:id  - Удалить контекст

GET /api/files/:filename  - Получить файл

GET /admin/export?token=  - Экспорт БД (admin)
GET /admin/stats?token=   - Статистика (admin)
```

## Структура проекта

```
math-app/
├── src/
│   ├── app.js              - Главный файл приложения
│   ├── config/             - Конфигурация
│   ├── controllers/        - Контроллеры
│   ├── models/            - Модели данных
│   ├── routes/            - Маршруты API
│   └── middleware/        - Middleware
├── scripts/
│   └── deployment/        - Скрипты деплоя
├── public/                - Статические файлы
├── data/                  - Данные (создается Docker)
│   ├── database/         - БД и uploads
│   └── public-images/    - Публичные изображения
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/    - GitHub Actions CI/CD
```

## Переменные окружения

```env
OPENAI_API_KEY=your_api_key
ADMIN_TOKEN=your_admin_token
PORT=3000
NODE_ENV=production
```

## Технологии

- Node.js + Express
- SQLite
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- Multer (загрузка файлов)

## Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Экспорт базы данных
npm run export-db

# Импорт базы данных
npm run import-db
```

## Лицензия

ISC
