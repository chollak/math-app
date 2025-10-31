# Math App - Быстрый старт на VPS (PS.kz)

## 🎯 Цель

Развернуть Math App на VPS сервере PS.kz за 15 минут.

## 📋 Что вам понадобится

- ✅ VPS сервер на PS.kz (Ubuntu 20.04/22.04)
- ✅ SSH доступ к серверу
- ✅ OpenAI API ключ
- ✅ Репозиторий Math App

## 🚀 Пошаговая инструкция

### Шаг 1: Заказ VPS на PS.kz

1. Перейдите на [ps.kz/hosting/vps](https://www.ps.kz/hosting/vps)
2. Выберите тариф:
   - **Минимум:** 1 CPU, 1 GB RAM (~3,120 тг/мес)
   - **Рекомендуется:** 2 CPU, 2 GB RAM (~4,500-5,000 тг/мес)
3. Выберите ОС: **Ubuntu 22.04 LTS**
4. Оплатите и дождитесь активации (5-15 минут)
5. Получите данные:
   - IP адрес сервера
   - Root пароль

### Шаг 2: Первый вход и создание пользователя

```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Создайте нового пользователя (не используйте root!)
adduser mathapp
usermod -aG sudo mathapp

# Переключитесь на нового пользователя
su - mathapp
```

### Шаг 3: Клонирование репозитория и запуск установки

```bash
# Клонировать репозиторий
git clone https://github.com/chollak/math-app.git ~/apps/math-app
cd ~/apps/math-app

# Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# Запустить установку ПО (Node.js, PM2, Nginx и т.д.)
./scripts/vps-setup.sh
```

⏱️ Это займет **3-5 минут**

### Шаг 4: Настройка приложения

```bash
# Создать .env файл
cp .env.example .env

# Отредактировать .env
nano .env
```

Укажите в `.env`:
```env
NODE_ENV=production
PORT=3000

# Ваш OpenAI API ключ
OPENAI_API_KEY=sk-your-key-here

# Сгенерируйте безопасный токен
ADMIN_TOKEN=your-secure-random-token-here
```

**Генерация ADMIN_TOKEN:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Сохраните файл: `Ctrl+O`, `Enter`, `Ctrl+X`

### Шаг 5: Развертывание приложения

```bash
# Запустить развертывание
./scripts/app-deploy.sh
```

⏱️ Это займет **1-2 минуты**

Приложение запустится на порту 3000 внутри сервера.

### Шаг 6: Настройка Nginx

```bash
# Настроить Nginx как reverse proxy
./scripts/nginx-setup.sh
```

Скрипт запросит **домен или IP адрес**:
- Если есть домен: `yourdomain.com`
- Если нет домена: `123.123.123.123` (IP вашего сервера)

⏱️ Это займет **1-2 минуты** (или 3-5 минут с SSL)

### Шаг 7: Проверка работы

Откройте в браузере:
```
http://YOUR_DOMAIN_OR_IP
```

Или проверьте через curl:
```bash
curl http://YOUR_DOMAIN_OR_IP/health
```

Вы должны увидеть JSON ответ:
```json
{
  "status": "OK",
  "message": "Math App API is running",
  "database": "Connected",
  "timestamp": "2025-10-22T..."
}
```

## 🎉 Готово!

Ваше приложение запущено и доступно!

### Полезные URL:

- **API Root:** `http://YOUR_DOMAIN_OR_IP/`
- **Health Check:** `http://YOUR_DOMAIN_OR_IP/health`
- **Admin Stats:** `http://YOUR_DOMAIN_OR_IP/admin/stats?token=YOUR_ADMIN_TOKEN`

---

## 📚 Дополнительные настройки (опционально)

### Настройка автоматического backup

```bash
./scripts/backup-setup.sh
```

Выберите частоту backup и следуйте инструкциям.

### Настройка домена

1. У регистратора домена создайте A-запись:
   ```
   Type: A
   Name: @
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```

2. Перенастройте Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/math-app
   # Измените server_name на ваш домен
   sudo systemctl restart nginx
   ```

3. Установите SSL сертификат:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 🔧 Управление приложением

### Основные команды:

```bash
# Статус приложения
pm2 status

# Просмотр логов
pm2 logs math-app

# Перезапуск приложения
pm2 restart math-app

# Остановка приложения
pm2 stop math-app

# Мониторинг в реальном времени
pm2 monit
```

### Обновление приложения:

```bash
cd ~/apps/math-app
./scripts/app-update.sh
```

### Просмотр логов:

```bash
# Логи приложения
pm2 logs math-app

# Логи Nginx
sudo tail -f /var/log/nginx/math-app-error.log
```

---

## 🆘 Проблемы?

### Приложение не запускается

```bash
# Проверьте логи
pm2 logs math-app --lines 50

# Проверьте .env файл
cat ~/apps/math-app/.env
```

### Nginx показывает 502 Bad Gateway

```bash
# Проверьте что приложение запущено
pm2 status

# Перезапустите приложение
pm2 restart math-app
```

### Не могу подключиться к серверу

```bash
# Проверьте firewall
sudo ufw status

# Убедитесь что порты открыты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📖 Полная документация

Для детальной информации смотрите:
- **Полное руководство:** `VPS_DEPLOYMENT_GUIDE.md`
- **Документация скриптов:** `scripts/README.md`

---

## 💰 Стоимость

**VPS PS.kz:**
- Базовый (1 CPU, 1 GB): ~3,120 тг/месяц
- Рекомендуемый (2 CPU, 2 GB): ~4,500-5,000 тг/месяц

**OpenAI API:**
- Pay-as-you-go по использованию
- Примерно $0.002 за 1000 токенов (GPT-4)

---

## 📞 Поддержка PS.kz

- **Сайт:** https://www.ps.kz
- **Телефон:** +7 (727) 330-20-00
- **Email:** support@ps.kz
- **Поддержка:** 24/7

---

*Создано: 2025-10-22*
