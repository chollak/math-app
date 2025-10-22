#!/bin/bash

# Math App - VPS Setup Script
# Автоматическая установка всех необходимых компонентов на Ubuntu/Debian VPS

set -e  # Exit on error

echo "================================="
echo "Math App VPS Setup"
echo "================================="
echo ""

# Проверка что скрипт не запущен от root
if [ "$EUID" -eq 0 ]; then
   echo "⚠️  Не запускайте этот скрипт от root!"
   echo "Пожалуйста, запустите от обычного пользователя с sudo правами."
   exit 1
fi

echo "📋 Этот скрипт установит:"
echo "  - Node.js 20.x LTS"
echo "  - PM2"
echo "  - Nginx"
echo "  - SQLite"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "1️⃣  Обновление системы..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "2️⃣  Установка базовых утилит..."
sudo apt install -y curl wget git nano htop sqlite3

echo ""
echo "3️⃣  Установка Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "✅ Node.js установлен: $(node --version)"
else
    echo "✅ Node.js уже установлен: $(node --version)"
fi

echo ""
echo "4️⃣  Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2 установлен: $(pm2 --version)"
else
    echo "✅ PM2 уже установлен: $(pm2 --version)"
fi

echo ""
echo "5️⃣  Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "✅ Nginx установлен и запущен"
else
    echo "✅ Nginx уже установлен"
fi

echo ""
echo "6️⃣  Настройка firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp  # SSH
    sudo ufw allow 80/tcp  # HTTP
    sudo ufw allow 443/tcp # HTTPS
    sudo ufw --force enable
    echo "✅ Firewall настроен"
else
    sudo apt install -y ufw
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    echo "✅ Firewall установлен и настроен"
fi

echo ""
echo "7️⃣  Создание директорий..."
mkdir -p ~/apps
mkdir -p ~/backups
echo "✅ Директории созданы"

echo ""
echo "================================="
echo "✅ Установка завершена!"
echo "================================="
echo ""
echo "📝 Следующие шаги:"
echo "  1. Склонируйте репозиторий: cd ~/apps && git clone YOUR_REPO_URL"
echo "  2. Используйте скрипт app-deploy.sh для развертывания приложения"
echo ""
echo "Версии установленного ПО:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PM2: $(pm2 --version)"
echo "  Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "  SQLite: $(sqlite3 --version | cut -d' ' -f1)"
echo ""
