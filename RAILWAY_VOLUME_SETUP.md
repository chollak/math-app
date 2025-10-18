# Railway Volume Setup для Math App

## 🎯 Цель
Настроить persistent storage на Railway для сохранения SQLite базы данных между деплоями.

## 📋 Пошаговая инструкция

### 1. Создание Volume в Railway

1. **Войдите в Railway Dashboard**
   - Откройте [railway.app](https://railway.app)
   - Выберите свой проект `math-app`

2. **Создайте новый Volume**
   - В проекте нажмите **"+ New"**
   - Выберите **"Volume"**
   - Настройте параметры:
     - **Name**: `math-app-database`
     - **Size**: `1 GB` (достаточно для SQLite)
     - **Mount Path**: `/app/database`

3. **Привяжите Volume к сервису**
   - Выберите ваш основной сервис (math-app)
   - В разделе **"Volumes"** подключите созданный volume
   - Mount path должен быть: `/app/database`

### 2. Настройка переменных окружения

В Railway Dashboard добавьте переменные окружения:

```env
# Обязательные для production
OPENAI_API_KEY=your_openai_api_key_here
ADMIN_TOKEN=your_secure_random_token_here

# Опциональные (Railway автоматически определит)
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
```

### 3. Экспорт текущих данных

**Перед настройкой volume сохраните текущие данные:**

1. **Через Admin API** (если у вас есть данные):
   ```bash
   curl "https://your-app.railway.app/admin/export?token=your_admin_token" -o backup.sql
   ```

2. **Или локально** (если база на локальной машине):
   ```bash
   npm run export-db
   ```

### 4. Деплой с новым volume

1. **Сделайте коммит изменений**:
   ```bash
   git add .
   git commit -m "feat: add Railway volume support for persistent database"
   git push
   ```

2. **Railway автоматически сделает редеплой**
   - База данных теперь будет храниться в `/app/database/database.sqlite`
   - При следующих деплоях данные сохранятся

### 5. Восстановление данных (если нужно)

**Если у вас есть backup данных:**

1. **Через API** (загрузите backup и запустите import):
   ```bash
   # Пока нет API для импорта, используйте прямое подключение к базе
   ```

2. **Или добавьте данные через интерфейс приложения**

### 6. Проверка работы

1. **Проверьте статус базы данных**:
   ```bash
   curl "https://your-app.railway.app/admin/stats?token=your_admin_token"
   ```

2. **Проверьте путь к базе в логах**:
   - В Railway Dashboard откройте Logs
   - Найдите строки с "Database configuration"
   - Убедитесь что путь: `/app/database/database.sqlite`

3. **Добавьте тестовые данные и сделайте редеплой**:
   - Данные должны сохраниться после редеплоя

## 🔧 Диагностика проблем

### Проблема: Volume не монтируется

**Симптомы**: В логах путь к базе остается `../../database/database.sqlite`

**Решение**:
1. Проверьте что volume создан и привязан к сервису
2. Убедитесь что Mount Path точно `/app/database`
3. Перезапустите деплой

### Проблема: Нет доступа к volume

**Симптомы**: Ошибки "Permission denied" или "Cannot create directory"

**Решение**:
1. Проверьте права доступа в логах
2. Volume должен быть mounted как read-write
3. При необходимости пересоздайте volume

### Проблема: Данные теряются

**Симптомы**: После деплоя база пустая

**Решение**:
1. Убедитесь что приложение пишет в `/app/database/database.sqlite`
2. Проверьте логи на наличие ошибок записи
3. Убедитесь что volume правильно подключен

## 📊 Мониторинг

### Admin endpoints для мониторинга:

- **Статистика**: `GET /admin/stats?token=TOKEN`
- **Экспорт данных**: `GET /admin/export?token=TOKEN` 
- **Расширенный health check**: `GET /admin/health?token=TOKEN`

### Логирование:

При запуске приложение выводит:
```
📍 Database configuration:
   Environment: production
   Path: /app/database/database.sqlite
   Directory: /app/database
   Railway: Yes
🚂 Railway volume detected, using persistent storage
```

## 🚀 Production Tips

1. **Backup стратегия**:
   - Настройте регулярные backup через cron job
   - Используйте `GET /admin/export` для автоматического backup

2. **Мониторинг места**:
   - Railway volumes имеют лимит места (1GB)
   - Мониторьте размер базы данных

3. **Безопасность**:
   - Используйте надежный ADMIN_TOKEN
   - Ограничьте доступ к admin endpoints

4. **Масштабирование**:
   - При росте данных рассмотрите миграцию на PostgreSQL
   - Railway предоставляет managed PostgreSQL