# Деплой на VPS

## На сервере (один раз)

### 1. Установите Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установите docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Клонируйте проект

```bash
cd /var/www
git clone https://github.com/chollak/math-app.git
cd math-app
```

### 3. Создайте .env файл

```bash
cp .env.example .env
nano .env
```

Заполните:
```
OPENAI_API_KEY=ваш_ключ
ADMIN_TOKEN=ваш_токен
PORT=3000
NODE_ENV=production
```

### 4. Запустите

```bash
bash scripts/deployment/deploy.sh
```

## Автоматический деплой через GitHub

### В GitHub Settings → Secrets добавьте:

- `VPS_HOST` - IP адрес VPS
- `VPS_USERNAME` - пользователь SSH (обычно root)
- `VPS_SSH_KEY` - приватный SSH ключ (cat ~/.ssh/id_rsa)
- `DEPLOY_PATH` - /var/www/math-app

**Готово!** Теперь при push в main проект автоматически обновится на сервере.

## Управление

```bash
cd /var/www/math-app

# Логи
docker-compose logs -f

# Перезапуск
docker-compose restart

# Обновление
git pull && docker-compose up -d --build
```

## Важно

Данные хранятся в `./data/` и **не удаляются** при обновлении:
- `data/database/` - SQLite база и uploads
- `data/public-images/` - изображения
- `data/temp/` - временные файлы
