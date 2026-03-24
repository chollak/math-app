
[http://77.243.80.114:3000/]([https://example.com](http://77.243.80.114:3000/))
# Math App

REST API для управления математическими вопросами.

## Быстрый старт

### Локально с Docker

```bash
cp .env.example .env
docker-compose up -d
```

### Без Docker

```bash
npm install
cp .env.example .env
npm start
```

## 🔧 Настройка для разработки

### Git Hooks для автосинхронизации Postman

После клонирования репозитория установите Git hooks для автоматического обновления Postman коллекции:

```bash
npm run setup:hooks
```

**Что делает hook:**
- ✅ Работает только в ветке `main`
- ✅ Автоматически обновляет Postman коллекцию при изменении API роутов
- ✅ Добавляет обновленную коллекцию в коммит
- ⚡ В feature ветках коммиты остаются быстрыми

### Postman API тестирование

```bash
# Генерация коллекции
npm run postman:generate

# Тестирование локального API
npm run postman:test

# Тестирование production API  
npm run postman:test-prod
```

Подробная документация: [postman/README.md](./postman/README.md)

## Деплой на VPS

См. [DEPLOY.md](./DEPLOY.md)
