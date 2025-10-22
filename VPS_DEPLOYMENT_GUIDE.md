# Руководство по развертыванию Math App на VPS (PS.kz)

## 📋 Содержание
1. [Выбор тарифа VPS](#выбор-тарифа-vps)
2. [Первоначальная настройка сервера](#первоначальная-настройка-сервера)
3. [Установка необходимого ПО](#установка-необходимого-по)
4. [Развертывание приложения](#развертывание-приложения)
5. [Настройка Nginx](#настройка-nginx)
6. [Настройка SSL (HTTPS)](#настройка-ssl-https)
7. [Автозапуск и мониторинг](#автозапуск-и-мониторинг)
8. [Backup и обслуживание](#backup-и-обслуживание)

---

## Выбор тарифа VPS

### Рекомендуемая конфигурация для Math App:

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| **CPU** | 1 ядро | 2 ядра |
| **RAM** | 1 GB | 2 GB |
| **Диск** | 10 GB SSD | 20 GB SSD |
| **Цена** | ~3,120 тг/мес | ~4,500-5,000 тг/мес |

**Для старта:** базовый тариф (1 CPU, 1 GB RAM) будет достаточен.

### Выбор ОС:
- **Рекомендуется:** Ubuntu 22.04 LTS или Ubuntu 20.04 LTS
- **Альтернатива:** Debian 11/12, AlmaLinux 9

---

## Первоначальная настройка сервера

### 1. Первый вход на сервер

После создания VPS вы получите:
- IP адрес сервера
- Root пароль

Подключитесь по SSH:
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Обновление системы

```bash
# Обновить список пакетов
apt update

# Обновить установленные пакеты
apt upgrade -y

# Установить базовые утилиты
apt install -y curl wget git nano htop
```

### 3. Создание пользователя для приложения

**Важно:** Не запускайте приложение от root!

```bash
# Создать нового пользователя
adduser mathapp

# Добавить в группу sudo
usermod -aG sudo mathapp

# Переключиться на нового пользователя
su - mathapp
```

### 4. Настройка firewall

```bash
# Вернуться к root
exit

# Установить UFW
apt install -y ufw

# Разрешить SSH
ufw allow 22/tcp

# Разрешить HTTP и HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw enable

# Проверить статус
ufw status
```

---

## Установка необходимого ПО

### 1. Установка Node.js (LTS версия)

```bash
# Установить Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверить установку
node --version
npm --version
```

### 2. Установка PM2 (менеджер процессов)

```bash
# Установить PM2 глобально
sudo npm install -g pm2

# Проверить установку
pm2 --version
```

### 3. Установка Nginx (веб-сервер)

```bash
# Установить Nginx
sudo apt install -y nginx

# Запустить Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверить статус
sudo systemctl status nginx
```

### 4. Установка SQLite (если не установлен)

```bash
# Установить SQLite
sudo apt install -y sqlite3

# Проверить установку
sqlite3 --version
```

---

## Развертывание приложения

### 1. Подготовка директории

```bash
# Переключиться на пользователя mathapp
su - mathapp

# Создать директорию для приложения
mkdir -p ~/apps
cd ~/apps

# Клонировать репозиторий (замените на ваш URL)
git clone https://github.com/chollak/math-app.git
cd math-app
```

### 2. Установка зависимостей

```bash
# Установить npm пакеты
npm install --production
```

### 3. Настройка переменных окружения

```bash
# Создать .env файл
nano .env
```

Добавьте следующие переменные:
```env
# Environment
NODE_ENV=production

# Server
PORT=3000

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Admin
ADMIN_TOKEN=your_secure_random_token_here

# Database (опционально, если хотите указать кастомный путь)
# DATABASE_PATH=/home/mathapp/apps/math-app/database/database.sqlite
```

**Генерация безопасного ADMIN_TOKEN:**
```bash
# Сгенерировать случайный токен
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Сохраните файл: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Создание директорий для данных

```bash
# Создать директории если их нет
mkdir -p database
mkdir -p public/uploads

# Проверить права доступа
ls -la
```

### 5. Миграция данных (если есть)

Если у вас есть данные с Railway или другого сервера:

```bash
# На локальной машине: экспортировать данные
curl "https://your-old-server.com/admin/export?token=YOUR_TOKEN" -o backup.sql

# Загрузить на VPS (выполнить на локальной машине)
scp backup.sql mathapp@YOUR_SERVER_IP:~/apps/math-app/

# На VPS: импортировать данные
cd ~/apps/math-app
sqlite3 database/database.sqlite < backup.sql

# Загрузить файлы uploads (если есть)
# На локальной машине:
scp -r public/uploads/* mathapp@YOUR_SERVER_IP:~/apps/math-app/public/uploads/
```

---

## Запуск приложения с PM2

### 1. Создание конфигурации PM2

```bash
# Создать файл ecosystem.config.js
nano ecosystem.config.js
```

Добавьте следующую конфигурацию:
```javascript
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
```

Сохраните файл.

### 2. Запуск приложения

```bash
# Создать директорию для логов
mkdir -p logs

# Запустить приложение через PM2
pm2 start ecosystem.config.js

# Проверить статус
pm2 status

# Просмотреть логи
pm2 logs math-app

# Остановить логи: Ctrl+C
```

### 3. Настройка автозапуска

```bash
# Сохранить текущий список процессов PM2
pm2 save

# Настроить автозапуск PM2 при загрузке системы
pm2 startup

# Выполните команду, которую выведет pm2 startup
# Она будет начинаться с sudo...
```

### 4. Полезные команды PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs math-app

# Перезапуск приложения
pm2 restart math-app

# Остановка приложения
pm2 stop math-app

# Удаление приложения из PM2
pm2 delete math-app

# Мониторинг в реальном времени
pm2 monit
```

---

## Настройка Nginx

### 1. Создание конфигурации для приложения

```bash
# Создать конфигурационный файл
sudo nano /etc/nginx/sites-available/math-app
```

Добавьте следующую конфигурацию:
```nginx
server {
    listen 80;
    listen [::]:80;

    # Замените на ваш домен или IP
    server_name YOUR_DOMAIN_OR_IP;

    # Логи
    access_log /var/log/nginx/math-app-access.log;
    error_log /var/log/nginx/math-app-error.log;

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;

    # Проксирование на Node.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Оптимизация для статических файлов
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Сохраните файл.

### 2. Активация конфигурации

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/math-app /etc/nginx/sites-enabled/

# Удалить конфигурацию по умолчанию (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию на ошибки
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx

# Проверить статус
sudo systemctl status nginx
```

### 3. Проверка работы

Откройте браузер и перейдите по адресу:
```
http://YOUR_SERVER_IP
```

Вы должны увидеть JSON ответ от вашего API.

---

## Настройка SSL (HTTPS)

### Вариант A: С доменом (Let's Encrypt - бесплатно)

**Требование:** У вас должен быть домен, указывающий на IP сервера.

```bash
# Установить Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получить SSL сертификат
sudo certbot --nginx -d your-domain.com

# Certbot автоматически настроит Nginx

# Проверить автообновление сертификата
sudo certbot renew --dry-run
```

### Вариант B: Без домена (самоподписанный сертификат)

Если у вас нет домена, можно создать самоподписанный сертификат для тестирования:

```bash
# Создать директорию для сертификатов
sudo mkdir -p /etc/nginx/ssl

# Создать самоподписанный сертификат
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/math-app.key \
  -out /etc/nginx/ssl/math-app.crt

# Изменить конфигурацию Nginx
sudo nano /etc/nginx/sites-available/math-app
```

Добавьте в конфигурацию:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name YOUR_SERVER_IP;

    ssl_certificate /etc/nginx/ssl/math-app.crt;
    ssl_certificate_key /etc/nginx/ssl/math-app.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... остальная конфигурация как выше
}

# Перенаправление с HTTP на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_SERVER_IP;
    return 301 https://$server_name$request_uri;
}
```

Перезапустите Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Настройка домена (опционально)

### 1. Настройка DNS записей

У вашего регистратора домена создайте A-запись:

```
Type: A
Name: @ (или subdomain)
Value: YOUR_SERVER_IP
TTL: 3600
```

Для поддомена (например, api.yourdomain.com):
```
Type: A
Name: api
Value: YOUR_SERVER_IP
TTL: 3600
```

### 2. Обновление конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/math-app
```

Замените `server_name YOUR_SERVER_IP;` на:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

Перезапустите Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Получение SSL сертификата

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Обновление приложения

### Создание скрипта для обновления

```bash
nano ~/apps/math-app/deploy.sh
```

Добавьте:
```bash
#!/bin/bash

# Скрипт обновления Math App

echo "🚀 Starting deployment..."

# Переход в директорию приложения
cd ~/apps/math-app

# Создание backup базы данных
echo "📦 Creating database backup..."
DATE=$(date +%Y%m%d_%H%M%S)
cp database/database.sqlite database/backup_$DATE.sqlite

# Получение последних изменений
echo "📥 Pulling latest changes..."
git pull origin main

# Установка зависимостей
echo "📚 Installing dependencies..."
npm install --production

# Перезапуск приложения
echo "🔄 Restarting application..."
pm2 restart math-app

# Проверка статуса
echo "✅ Checking status..."
pm2 status math-app

echo "🎉 Deployment completed!"
```

Сделайте скрипт исполняемым:
```bash
chmod +x ~/apps/math-app/deploy.sh
```

### Использование скрипта

```bash
# Запуск обновления
cd ~/apps/math-app
./deploy.sh
```

---

## Backup и обслуживание

### 1. Автоматический backup базы данных

Создайте скрипт backup:
```bash
nano ~/backup-database.sh
```

Добавьте:
```bash
#!/bin/bash

# Директории
APP_DIR="$HOME/apps/math-app"
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создать директорию для backup если не существует
mkdir -p $BACKUP_DIR

# Backup базы данных
echo "Creating database backup..."
cp $APP_DIR/database/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Backup uploads
echo "Creating uploads backup..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR/public uploads

# Удалить старые backup (старше 30 дней)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
echo "Database: database_$DATE.sqlite"
echo "Uploads: uploads_$DATE.tar.gz"
```

Сделайте исполняемым:
```bash
chmod +x ~/backup-database.sh
```

### 2. Настройка автоматического backup через cron

```bash
# Открыть crontab
crontab -e
```

Добавьте строку (backup каждый день в 3:00 ночи):
```cron
0 3 * * * /home/mathapp/backup-database.sh >> /home/mathapp/backup.log 2>&1
```

Сохраните и закройте.

### 3. Восстановление из backup

```bash
# Остановить приложение
pm2 stop math-app

# Восстановить базу данных
cp ~/backups/database_YYYYMMDD_HHMMSS.sqlite ~/apps/math-app/database/database.sqlite

# Восстановить uploads
cd ~/apps/math-app/public
rm -rf uploads
tar -xzf ~/backups/uploads_YYYYMMDD_HHMMSS.tar.gz

# Запустить приложение
pm2 start math-app
```

---

## Мониторинг и диагностика

### 1. Проверка здоровья приложения

```bash
# Health check
curl http://localhost:3000/health

# С удаленной машины
curl http://YOUR_SERVER_IP/health
```

### 2. Просмотр логов

```bash
# Логи PM2
pm2 logs math-app

# Логи Nginx (ошибки)
sudo tail -f /var/log/nginx/math-app-error.log

# Логи Nginx (доступ)
sudo tail -f /var/log/nginx/math-app-access.log

# Системные логи
sudo journalctl -u nginx -f
```

### 3. Мониторинг ресурсов

```bash
# Использование CPU и RAM
htop

# Использование диска
df -h

# Размер базы данных
du -sh ~/apps/math-app/database/

# Статистика PM2
pm2 monit
```

### 4. Проверка портов

```bash
# Проверить что порт 3000 слушается
sudo netstat -tlnp | grep 3000

# Проверить Nginx
sudo netstat -tlnp | grep nginx
```

---

## Безопасность

### 1. Настройка SSH ключей (рекомендуется)

На локальной машине:
```bash
# Сгенерировать SSH ключ (если нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Скопировать публичный ключ на сервер
ssh-copy-id mathapp@YOUR_SERVER_IP
```

### 2. Отключение парольной аутентификации

```bash
sudo nano /etc/ssh/sshd_config
```

Измените:
```
PasswordAuthentication no
PermitRootLogin no
```

Перезапустите SSH:
```bash
sudo systemctl restart sshd
```

### 3. Установка fail2ban

```bash
# Установить fail2ban
sudo apt install -y fail2ban

# Запустить и включить
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Проверить статус
sudo fail2ban-client status
```

### 4. Регулярные обновления

```bash
# Создать скрипт обновления системы
sudo nano /usr/local/bin/system-update.sh
```

Добавьте:
```bash
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
apt autoclean
```

Сделайте исполняемым:
```bash
sudo chmod +x /usr/local/bin/system-update.sh
```

Добавьте в cron (каждое воскресенье в 4:00):
```bash
sudo crontab -e
```

Добавьте:
```cron
0 4 * * 0 /usr/local/bin/system-update.sh >> /var/log/system-update.log 2>&1
```

---

## Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверить логи PM2
pm2 logs math-app --lines 100

# Проверить .env файл
cat ~/apps/math-app/.env

# Попробовать запустить вручную
cd ~/apps/math-app
node src/app.js
```

### Проблема: Nginx показывает 502 Bad Gateway

```bash
# Проверить что приложение запущено
pm2 status

# Проверить что порт 3000 слушается
sudo netstat -tlnp | grep 3000

# Перезапустить приложение
pm2 restart math-app

# Проверить логи Nginx
sudo tail -50 /var/log/nginx/math-app-error.log
```

### Проблема: База данных не создается/не читается

```bash
# Проверить права доступа
ls -la ~/apps/math-app/database/

# Дать права на запись
chmod 755 ~/apps/math-app/database
chmod 644 ~/apps/math-app/database/database.sqlite

# Проверить путь в логах приложения
pm2 logs math-app | grep -i database
```

### Проблема: Недостаточно места на диске

```bash
# Проверить использование диска
df -h

# Найти большие файлы
du -sh ~/apps/math-app/*

# Очистить старые логи PM2
pm2 flush

# Очистить старые backup
rm ~/backups/database_old_*.sqlite
```

---

## Чек-лист развертывания

- [ ] VPS создан и доступен по SSH
- [ ] Система обновлена
- [ ] Создан пользователь mathapp
- [ ] Настроен firewall (порты 22, 80, 443)
- [ ] Node.js установлен
- [ ] PM2 установлен
- [ ] Nginx установлен
- [ ] Репозиторий склонирован
- [ ] npm пакеты установлены
- [ ] .env файл создан и настроен
- [ ] Приложение запущено через PM2
- [ ] PM2 настроен на автозапуск
- [ ] Nginx настроен как reverse proxy
- [ ] Приложение доступно через браузер
- [ ] SSL сертификат установлен (опционально)
- [ ] Домен настроен (опционально)
- [ ] Backup скрипт создан
- [ ] Cron для backup настроен
- [ ] Логи проверены

---

## Полезные команды - шпаргалка

```bash
# PM2
pm2 status                    # Статус процессов
pm2 logs math-app            # Просмотр логов
pm2 restart math-app         # Перезапуск
pm2 stop math-app            # Остановка
pm2 monit                    # Мониторинг

# Nginx
sudo nginx -t                # Проверка конфигурации
sudo systemctl restart nginx # Перезапуск
sudo systemctl status nginx  # Статус

# Система
htop                        # Мониторинг системы
df -h                       # Использование диска
free -m                     # Использование RAM
sudo ufw status            # Статус firewall

# Логи
pm2 logs                   # Логи приложения
sudo tail -f /var/log/nginx/error.log  # Логи Nginx

# Обновление
cd ~/apps/math-app
./deploy.sh                # Обновление приложения
```

---

## Поддержка и контакты

**PS.kz:**
- Сайт: https://www.ps.kz
- Поддержка: 24/7
- Телефон: +7 (727) 330-20-00
- Email: support@ps.kz

**Math App репозиторий:**
- GitHub: https://github.com/chollak/math-app

---

*Документ создан: 2025-10-22*
*Версия: 1.0*
