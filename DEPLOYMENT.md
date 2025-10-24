# Руководство по развертыванию Math App на VPS

Это руководство поможет вам развернуть приложение Math App на VPS сервере с использованием Docker и настроить автоматический CI/CD через GitHub Actions.

## Оглавление

1. [Требования](#требования)
2. [Первоначальная настройка сервера](#первоначальная-настройка-сервера)
3. [Настройка проекта на сервере](#настройка-проекта-на-сервере)
4. [Настройка CI/CD](#настройка-cicd)
5. [Управление приложением](#управление-приложением)
6. [Резервное копирование](#резервное-копирование)
7. [Устранение неполадок](#устранение-неполадок)

## Требования

- VPS сервер с Ubuntu 20.04+ (или другой Linux дистрибутив)
- Минимум 1GB RAM, 1 CPU
- 10GB свободного места на диске
- Root доступ к серверу

## Первоначальная настройка сервера

### 1. Подключитесь к серверу

```bash
ssh root@your_vps_ip
```

### 2. Скачайте и запустите скрипт установки

```bash
# Скачать скрипт
curl -O https://raw.githubusercontent.com/yourusername/math-app/main/scripts/deployment/setup-server.sh

# Сделать исполняемым
chmod +x setup-server.sh

# Запустить (требует root прав)
sudo ./setup-server.sh
```

Скрипт автоматически установит:
- Docker и Docker Compose
- Git
- Fail2ban (защита от brute-force атак)
- Настроит автоматические обновления безопасности
- Создаст необходимые директории

### 3. Настройка SSH ключа для GitHub

```bash
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your_email@example.com"

# Показать публичный ключ
cat ~/.ssh/id_ed25519.pub
```

Скопируйте публичный ключ и добавьте его в GitHub:
1. GitHub → Settings → SSH and GPG keys → New SSH key
2. Вставьте ключ и сохраните

## Настройка проекта на сервере

### 1. Клонируйте репозиторий

```bash
cd /var/www
git clone git@github.com:yourusername/math-app.git
cd math-app
```

### 2. Создайте файл .env

```bash
# Скопируйте пример
cp .env.production .env

# Отредактируйте файл
nano .env
```

Заполните необходимые переменные:
```env
OPENAI_API_KEY=sk-...
ADMIN_TOKEN=your_secure_token_here
PORT=3000
NODE_ENV=production
```

Для генерации безопасного токена:
```bash
openssl rand -hex 32
```

### 3. Создайте директории для данных

```bash
mkdir -p data/database data/public-images data/temp
```

### 4. Запустите приложение

```bash
# Используйте deploy скрипт
bash scripts/deployment/deploy.sh

# Или вручную
docker-compose build
docker-compose up -d
```

### 5. Проверьте статус

```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи
docker-compose logs -f

# Проверить health endpoint
curl http://localhost:3000/health
```

## Настройка CI/CD

### 1. Настройка GitHub Secrets

Перейдите в GitHub → Your Repository → Settings → Secrets and variables → Actions

Добавьте следующие secrets:

| Секрет | Описание | Пример |
|--------|----------|---------|
| `VPS_HOST` | IP адрес вашего VPS | `123.45.67.89` |
| `VPS_USERNAME` | SSH пользователь | `root` |
| `VPS_SSH_KEY` | Приватный SSH ключ | Содержимое `~/.ssh/id_rsa` |
| `VPS_PORT` | SSH порт (опционально) | `22` |
| `DEPLOY_PATH` | Путь к проекту | `/var/www/math-app` |

### 2. Получение приватного SSH ключа

**На вашем сервере:**
```bash
cat ~/.ssh/id_rsa
```

Скопируйте **весь** вывод (включая `-----BEGIN/END-----`) и вставьте в `VPS_SSH_KEY` secret.

### 3. Настройка переменных окружения на сервере

**Важно:** GitHub Actions использует .env файл на сервере, поэтому убедитесь что он настроен правильно:

```bash
# На сервере
cd /var/www/math-app
nano .env
```

### 4. Тестирование CI/CD

После настройки secrets:
1. Сделайте любое изменение в коде
2. Закоммитьте и запушьте в main/master ветку
3. Перейдите в GitHub → Actions и наблюдайте за процессом деплоя

```bash
git add .
git commit -m "Test CI/CD"
git push origin main
```

## Управление приложением

### Основные команды

```bash
# Перейти в директорию проекта
cd /var/www/math-app

# Просмотр логов
docker-compose logs -f

# Остановка контейнеров
docker-compose down

# Запуск контейнеров
docker-compose up -d

# Перезапуск контейнеров
docker-compose restart

# Пересборка образа
docker-compose build --no-cache

# Просмотр статуса
docker-compose ps

# Выполнение команды в контейнере
docker-compose exec math-app sh
```

### Обновление вручную

```bash
cd /var/www/math-app
bash scripts/deployment/deploy.sh
```

### Просмотр логов контейнера

```bash
# Все логи
docker-compose logs

# Последние 100 строк
docker-compose logs --tail=100

# С отслеживанием новых логов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs math-app
```

## Резервное копирование

### Автоматическое резервное копирование базы данных

Создайте cron job для автоматического бэкапа:

```bash
# Создайте скрипт бэкапа
nano /var/www/math-app/scripts/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/math-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных
cp /var/www/math-app/data/database/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/math-app/data/database/uploads

# Удалить бэкапы старше 30 дней
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Сделать исполняемым
chmod +x /var/www/math-app/scripts/backup.sh

# Добавить в crontab (каждый день в 2:00 AM)
crontab -e
```

Добавьте строку:
```
0 2 * * * /var/www/math-app/scripts/backup.sh >> /var/log/math-app-backup.log 2>&1
```

### Ручное резервное копирование

```bash
# Остановить контейнер
docker-compose down

# Создать бэкап
tar -czf math-app-backup-$(date +%Y%m%d).tar.gz data/

# Запустить контейнер
docker-compose up -d
```

### Восстановление из бэкапа

```bash
# Остановить контейнер
docker-compose down

# Восстановить данные
tar -xzf math-app-backup-YYYYMMDD.tar.gz

# Запустить контейнер
docker-compose up -d
```

## Структура данных

Все данные приложения хранятся в директории `data/`:

```
data/
├── database/
│   ├── database.sqlite       # База данных SQLite
│   └── uploads/              # Загруженные файлы (фото вопросов)
├── public-images/            # Публичные изображения
└── temp/                     # Временные файлы
```

**Важно:** Эти директории монтируются как Docker volumes, поэтому данные **сохраняются** при перезапуске контейнеров.

## Настройка Nginx (опционально)

Для использования доменного имени и HTTPS:

### 1. Установка Nginx

```bash
sudo apt install nginx
```

### 2. Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/math-app
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активировать конфигурацию
sudo ln -s /etc/nginx/sites-available/math-app /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

### 3. Установка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo certbot renew --dry-run
```

## Мониторинг

### Проверка использования ресурсов

```bash
# Использование CPU и памяти контейнером
docker stats math-app

# Использование диска
df -h
du -sh /var/www/math-app/data/
```

### Health Check

```bash
# Проверка health endpoint
curl http://localhost:3000/health

# Ожидаемый ответ:
# {"status":"OK","message":"Math App API is running","database":"Connected","timestamp":"..."}
```

## Устранение неполадок

### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs

# Проверить конфигурацию
docker-compose config

# Пересобрать образ
docker-compose build --no-cache
docker-compose up -d
```

### База данных недоступна

```bash
# Проверить права доступа
ls -la data/database/

# Проверить что база существует
ls -la data/database/database.sqlite

# Зайти в контейнер и проверить
docker-compose exec math-app sh
ls -la /app/database/
```

### Проблемы с загрузкой файлов

```bash
# Проверить директорию uploads
ls -la data/database/uploads/

# Проверить права доступа
chmod -R 755 data/database/uploads/
```

### GitHub Actions деплой не работает

1. Проверьте правильность secrets в GitHub
2. Убедитесь что SSH ключ правильный
3. Проверьте логи в GitHub Actions
4. Попробуйте подключиться к серверу вручную:

```bash
ssh -i /path/to/key username@vps_ip
```

### Недостаточно памяти

Если сервер работает медленно:

```bash
# Добавить swap файл
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделать постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые volumes
docker volume prune

# Полная очистка
docker system prune -a --volumes
```

## Безопасность

### Рекомендации

1. **Изменить SSH порт** (опционально):
```bash
sudo nano /etc/ssh/sshd_config
# Изменить Port 22 на другой порт
sudo systemctl restart sshd
```

2. **Отключить root login по SSH**:
```bash
sudo nano /etc/ssh/sshd_config
# Установить: PermitRootLogin no
sudo systemctl restart sshd
```

3. **Регулярно обновлять систему**:
```bash
sudo apt update && sudo apt upgrade -y
```

4. **Использовать сильные пароли и токены**:
```bash
# Генерация безопасного токена
openssl rand -hex 32
```

5. **Настроить firewall**:
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте раздел [Устранение неполадок](#устранение-неполадок)
2. Просмотрите логи приложения: `docker-compose logs`
3. Создайте issue в GitHub репозитории

---

**Успешного развертывания!**
