#!/bin/bash

# Math App - Backup Setup Script
# Настройка автоматического резервного копирования

set -e  # Exit on error

APP_DIR="$HOME/apps/math-app"
BACKUP_DIR="$HOME/backups"

echo "================================="
echo "Math App Backup Setup"
echo "================================="
echo ""

# Создание директории для backup
echo "1️⃣  Создание директории для backup..."
mkdir -p $BACKUP_DIR
echo "✅ Директория создана: $BACKUP_DIR"

echo ""
echo "2️⃣  Создание скрипта backup..."

# Создание скрипта backup
cat > $HOME/backup-database.sh << 'EOF'
#!/bin/bash

# Math App Backup Script

# Директории
APP_DIR="$HOME/apps/math-app"
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

# Создать директорию для backup если не существует
mkdir -p $BACKUP_DIR

echo "=== Math App Backup ==="
echo "Date: $(date)"
echo ""

# Backup базы данных
if [ -f "$APP_DIR/database/database.sqlite" ]; then
    echo "Creating database backup..."
    cp $APP_DIR/database/database.sqlite $BACKUP_DIR/database_$DATE.sqlite
    echo "✅ Database: database_$DATE.sqlite"
else
    echo "⚠️  Database file not found"
fi

# Backup uploads
if [ -d "$APP_DIR/public/uploads" ]; then
    echo "Creating uploads backup..."
    tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR/public uploads 2>/dev/null || true
    echo "✅ Uploads: uploads_$DATE.tar.gz"
else
    echo "⚠️  Uploads directory not found"
fi

# Backup .env файла (опционально - будьте осторожны с секретами!)
if [ -f "$APP_DIR/.env" ]; then
    echo "Creating .env backup..."
    cp $APP_DIR/.env $BACKUP_DIR/env_$DATE.backup
    echo "✅ .env: env_$DATE.backup"
fi

# Удалить старые backup (старше KEEP_DAYS дней)
echo "Cleaning old backups (older than $KEEP_DAYS days)..."
find $BACKUP_DIR -name "database_*.sqlite" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find $BACKUP_DIR -name "uploads_*.tar.gz" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true
find $BACKUP_DIR -name "env_*.backup" -type f -mtime +$KEEP_DAYS -delete 2>/dev/null || true

echo ""
echo "✅ Backup completed!"
echo "Location: $BACKUP_DIR"
echo ""

# Показать размеры backup
echo "Backup files:"
ls -lh $BACKUP_DIR | grep $DATE || true
echo ""

# Статистика всех backup
echo "Total backup size:"
du -sh $BACKUP_DIR
echo ""
EOF

chmod +x $HOME/backup-database.sh
echo "✅ Скрипт создан: $HOME/backup-database.sh"

echo ""
echo "3️⃣  Тестирование backup..."
$HOME/backup-database.sh

echo ""
echo "4️⃣  Настройка автоматического backup через cron..."
echo ""
echo "Выберите частоту backup:"
echo "  1) Каждый день в 03:00"
echo "  2) Каждые 12 часов"
echo "  3) Каждую неделю (воскресенье 03:00)"
echo "  4) Пропустить автоматическую настройку"
echo ""
read -p "Выберите вариант (1-4): " CRON_CHOICE

CRON_LINE=""
case $CRON_CHOICE in
    1)
        CRON_LINE="0 3 * * * $HOME/backup-database.sh >> $HOME/backup.log 2>&1"
        echo "✅ Выбрано: Ежедневный backup в 03:00"
        ;;
    2)
        CRON_LINE="0 */12 * * * $HOME/backup-database.sh >> $HOME/backup.log 2>&1"
        echo "✅ Выбрано: Backup каждые 12 часов"
        ;;
    3)
        CRON_LINE="0 3 * * 0 $HOME/backup-database.sh >> $HOME/backup.log 2>&1"
        echo "✅ Выбрано: Еженедельный backup (воскресенье 03:00)"
        ;;
    4)
        echo "⏭️  Автоматический backup не настроен"
        ;;
    *)
        echo "❌ Неверный выбор. Автоматический backup не настроен"
        ;;
esac

if [ -n "$CRON_LINE" ]; then
    # Проверить существует ли уже cron задача
    (crontab -l 2>/dev/null | grep -v "backup-database.sh"; echo "$CRON_LINE") | crontab -
    echo "✅ Cron задача добавлена"
    echo ""
    echo "📋 Текущие cron задачи:"
    crontab -l | grep backup-database.sh || true
fi

echo ""
echo "================================="
echo "✅ Backup настроен!"
echo "================================="
echo ""
echo "📁 Директория backup: $BACKUP_DIR"
echo "📜 Скрипт backup: $HOME/backup-database.sh"
echo "📊 Лог backup: $HOME/backup.log"
echo ""
echo "📝 Полезные команды:"
echo "  Ручной backup:        $HOME/backup-database.sh"
echo "  Просмотр backup:      ls -lh $BACKUP_DIR"
echo "  Просмотр логов:       tail -f $HOME/backup.log"
echo "  Редактировать cron:   crontab -e"
echo ""

echo "📦 Восстановление из backup:"
echo "  База данных:  cp $BACKUP_DIR/database_YYYYMMDD_HHMMSS.sqlite $APP_DIR/database/database.sqlite"
echo "  Uploads:      tar -xzf $BACKUP_DIR/uploads_YYYYMMDD_HHMMSS.tar.gz -C $APP_DIR/public"
echo ""
