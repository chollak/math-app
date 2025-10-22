# Math App - Deployment Scripts

Набор скриптов для автоматизации развертывания и обслуживания Math App на VPS сервере.

## 📦 Доступные скрипты

### 1. `vps-setup.sh` - Первоначальная настройка VPS

Устанавливает все необходимое ПО на чистый VPS сервер.

**Устанавливает:**
- Node.js 20.x LTS
- PM2 (менеджер процессов)
- Nginx (веб-сервер)
- SQLite
- UFW (firewall)
- Базовые утилиты

**Использование:**
```bash
# После первого входа на VPS под обычным пользователем (не root)
cd ~
git clone https://github.com/chollak/math-app.git
cd math-app
chmod +x scripts/*.sh
./scripts/vps-setup.sh
```

**Время выполнения:** 3-5 минут

---

### 2. `app-deploy.sh` - Развертывание приложения

Разворачивает Math App: устанавливает зависимости, настраивает PM2, запускает приложение.

**Что делает:**
- Устанавливает npm зависимости
- Создает необходимые директории
- Создает конфигурацию PM2
- Запускает приложение
- Настраивает автозапуск

**Требования:**
- Выполнен `vps-setup.sh`
- Создан файл `.env` с настройками

**Использование:**
```bash
cd ~/apps/math-app

# Создать и настроить .env
cp .env.example .env
nano .env  # Укажите OPENAI_API_KEY и ADMIN_TOKEN

# Запустить развертывание
./scripts/app-deploy.sh
```

**Время выполнения:** 1-2 минуты

---

### 3. `nginx-setup.sh` - Настройка Nginx

Настраивает Nginx как reverse proxy для приложения.

**Что делает:**
- Создает конфигурацию Nginx
- Активирует конфигурацию
- Перезапускает Nginx
- Опционально: устанавливает SSL сертификат (Let's Encrypt)

**Требования:**
- Выполнен `vps-setup.sh`
- Приложение запущено через PM2

**Использование:**
```bash
cd ~/apps/math-app
./scripts/nginx-setup.sh

# Скрипт запросит домен или IP адрес
# Пример: yourdomain.com или 123.123.123.123
```

**Время выполнения:** 1-2 минуты (без SSL) / 3-5 минут (с SSL)

---

### 4. `backup-setup.sh` - Настройка backup

Настраивает автоматическое резервное копирование данных.

**Что делает:**
- Создает скрипт для backup
- Настраивает автоматический запуск через cron
- Создает первый backup

**Резервирует:**
- База данных SQLite
- Загруженные файлы (uploads)
- .env файл

**Использование:**
```bash
cd ~/apps/math-app
./scripts/backup-setup.sh

# Выберите частоту backup:
# 1 - Ежедневно в 03:00
# 2 - Каждые 12 часов
# 3 - Еженедельно (воскресенье 03:00)
```

**Хранение:** Backup старше 30 дней удаляются автоматически

---

### 5. `app-update.sh` - Обновление приложения

Обновляет приложение из Git репозитория.

**Что делает:**
- Создает backup базы данных
- Загружает обновления из Git
- Обновляет npm зависимости
- Перезапускает приложение
- Проверяет работоспособность

**Использование:**
```bash
cd ~/apps/math-app
./scripts/app-update.sh
```

**Время выполнения:** 1-2 минуты

---

## 🚀 Быстрый старт

### Полное развертывание с нуля:

```bash
# 1. Подключиться к VPS
ssh your-user@your-vps-ip

# 2. Клонировать репозиторий
cd ~
git clone https://github.com/chollak/math-app.git ~/apps/math-app
cd ~/apps/math-app

# 3. Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# 4. Установить ПО на сервер
./scripts/vps-setup.sh

# 5. Настроить переменные окружения
cp .env.example .env
nano .env  # Укажите OPENAI_API_KEY и ADMIN_TOKEN

# 6. Развернуть приложение
./scripts/app-deploy.sh

# 7. Настроить Nginx
./scripts/nginx-setup.sh

# 8. Настроить backup (опционально)
./scripts/backup-setup.sh
```

**Общее время:** 10-15 минут

---

## 📝 Ручные команды (если нужны)

### Управление PM2:
```bash
pm2 status                # Статус приложения
pm2 logs math-app         # Просмотр логов
pm2 restart math-app      # Перезапуск
pm2 stop math-app         # Остановка
pm2 monit                 # Мониторинг в реальном времени
```

### Управление Nginx:
```bash
sudo nginx -t                      # Проверка конфигурации
sudo systemctl restart nginx       # Перезапуск
sudo systemctl status nginx        # Статус
sudo tail -f /var/log/nginx/math-app-error.log  # Логи
```

### Backup:
```bash
~/backup-database.sh              # Ручной backup
ls -lh ~/backups                  # Список backup
tail -f ~/backup.log              # Логи backup
```

### Обновление:
```bash
cd ~/apps/math-app
git pull origin main              # Загрузить обновления
npm install --production          # Обновить зависимости
pm2 restart math-app              # Перезапустить
```

---

## 🔧 Troubleshooting

### Проблема: Скрипт не запускается

**Решение:**
```bash
# Сделать скрипт исполняемым
chmod +x scripts/script-name.sh

# Проверить права
ls -la scripts/
```

### Проблема: npm install завершается с ошибкой

**Решение:**
```bash
# Очистить npm cache
npm cache clean --force

# Удалить node_modules и установить заново
rm -rf node_modules package-lock.json
npm install --production
```

### Проблема: PM2 не запускает приложение

**Решение:**
```bash
# Проверить логи
pm2 logs math-app --lines 50

# Попробовать запустить вручную для диагностики
cd ~/apps/math-app
node src/app.js
```

### Проблема: Nginx показывает 502 Bad Gateway

**Решение:**
```bash
# Проверить что приложение запущено
pm2 status

# Проверить что порт 3000 слушается
sudo netstat -tlnp | grep 3000

# Перезапустить приложение
pm2 restart math-app
```

---

## 📚 Дополнительные ресурсы

- **Полное руководство:** `VPS_DEPLOYMENT_GUIDE.md`
- **Документация PM2:** https://pm2.keymetrics.io/
- **Документация Nginx:** https://nginx.org/en/docs/
- **Node.js LTS:** https://nodejs.org/

---

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи:
   - Приложение: `pm2 logs math-app`
   - Nginx: `sudo tail -f /var/log/nginx/math-app-error.log`

2. Проверьте статус сервисов:
   - PM2: `pm2 status`
   - Nginx: `sudo systemctl status nginx`

3. Обратитесь к полному руководству: `VPS_DEPLOYMENT_GUIDE.md`

4. Откройте issue на GitHub: https://github.com/chollak/math-app/issues

---

*Последнее обновление: 2025-10-22*
