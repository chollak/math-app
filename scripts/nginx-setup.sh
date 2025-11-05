#!/bin/bash

# Math App - Nginx Setup Script
# Настройка Nginx как reverse proxy для приложения

set -e  # Exit on error

echo "================================="
echo "Math App Nginx Setup"
echo "================================="
echo ""

# Запрос домена или IP
echo "Введите домен или IP адрес для приложения:"
echo "Примеры:"
echo "  - yourdomain.com"
echo "  - api.yourdomain.com"
echo "  - 123.123.123.123 (IP адрес)"
echo ""
read -p "Домен/IP: " SERVER_NAME

if [ -z "$SERVER_NAME" ]; then
    echo "❌ Домен/IP не может быть пустым"
    exit 1
fi

echo ""
echo "📝 Создание конфигурации Nginx..."

# Создание конфигурации
sudo tee /etc/nginx/sites-available/math-app > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;

    server_name $SERVER_NAME;

    # Логи
    access_log /var/log/nginx/math-app-access.log;
    error_log /var/log/nginx/math-app-error.log;

    # Ограничение размера загружаемых файлов (10MB)
    client_max_body_size 10M;

    # Проксирование на Node.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

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
EOF

echo "✅ Конфигурация создана"

echo ""
echo "🔗 Активация конфигурации..."
sudo ln -sf /etc/nginx/sites-available/math-app /etc/nginx/sites-enabled/

echo ""
echo "🧪 Проверка конфигурации Nginx..."
sudo nginx -t

echo ""
echo "🔄 Перезапуск Nginx..."
sudo systemctl restart nginx

echo ""
echo "================================="
echo "✅ Nginx настроен!"
echo "================================="
echo ""
echo "🌐 Ваше приложение доступно по адресу:"
echo "  http://$SERVER_NAME"
echo ""

# Проверка доступности
echo "🔍 Проверка доступности..."
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_NAME/ || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Приложение отвечает! (HTTP $HTTP_STATUS)"
else
    echo "⚠️  Приложение не отвечает (HTTP $HTTP_STATUS)"
    echo "Проверьте логи:"
    echo "  sudo tail -50 /var/log/nginx/math-app-error.log"
    echo "  pm2 logs math-app"
fi

echo ""
echo "📝 Следующий шаг: Настройка HTTPS (опционально)"
echo ""

# Проверка наличия домена для Let's Encrypt
if [[ $SERVER_NAME =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "⚠️  Вы используете IP адрес."
    echo "Для получения SSL сертификата от Let's Encrypt нужен домен."
else
    echo "Хотите установить бесплатный SSL сертификат от Let's Encrypt?"
    echo ""
    read -p "Установить SSL сейчас? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "📦 Установка Certbot..."
        sudo apt install -y certbot python3-certbot-nginx

        echo ""
        echo "🔐 Получение SSL сертификата..."
        sudo certbot --nginx -d $SERVER_NAME

        echo ""
        echo "✅ SSL сертификат установлен!"
        echo "🌐 Приложение доступно по HTTPS:"
        echo "  https://$SERVER_NAME"
    else
        echo ""
        echo "Для установки SSL позже используйте команды:"
        echo "  sudo apt install -y certbot python3-certbot-nginx"
        echo "  sudo certbot --nginx -d $SERVER_NAME"
    fi
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
