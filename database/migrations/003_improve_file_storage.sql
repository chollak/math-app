-- ============================================
-- Migration: Улучшение хранения файлов
-- Версия: 003
-- Дата: 2025-01-24
-- ============================================

-- 1. Создание таблицы для хранения метаданных файлов
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Основная информация
  filename TEXT NOT NULL UNIQUE,         -- Уникальное имя файла (q123_thumb_abc.webp)
  original_filename TEXT,                -- Оригинальное имя (photo.jpg)
  file_key TEXT UNIQUE,                  -- Ключ в облачном хранилище (questions/123/thumb.webp)

  -- Тип и назначение
  entity_type TEXT NOT NULL,             -- 'question', 'context', 'user_avatar', 'subject_icon'
  entity_id INTEGER NOT NULL,            -- ID связанной сущности
  file_type TEXT NOT NULL,               -- 'image', 'video', 'audio', 'document'
  mime_type TEXT NOT NULL,               -- 'image/jpeg', 'image/webp', etc.
  version TEXT NOT NULL,                 -- 'original', 'thumbnail', 'medium', 'large'

  -- Размеры и метаданные
  file_size INTEGER NOT NULL,            -- Размер в байтах
  width INTEGER,                         -- Ширина (для изображений)
  height INTEGER,                        -- Высота (для изображений)
  duration INTEGER,                      -- Длительность (для видео/аудио)

  -- Хранилище
  storage_provider TEXT DEFAULT 'local', -- 'local', 's3', 'r2', 'spaces'
  storage_path TEXT NOT NULL,            -- Локальный путь или S3 путь
  cdn_url TEXT,                          -- CDN URL (если используется)
  is_public BOOLEAN DEFAULT 1,           -- Публичный доступ?

  -- Группировка (для связи версий одного файла)
  file_group TEXT,                       -- Группа версий (q123_1, q123_2)

  -- Метаинформация
  uploaded_by INTEGER,                   -- ID пользователя, загрузившего файл
  upload_ip TEXT,                        -- IP адрес загрузки

  -- Временные метки
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,                   -- Soft delete

  -- Индексы для быстрого поиска
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_file_group (file_group),
  INDEX idx_storage_provider (storage_provider),
  INDEX idx_created_at (created_at)
);

-- 2. Обновление таблицы questions
-- Добавляем новую колонку для хранения ссылок на файлы
ALTER TABLE questions ADD COLUMN file_ids TEXT DEFAULT '[]';
-- JSON массив ID файлов из таблицы files

-- 3. Обновление таблицы contexts
ALTER TABLE contexts ADD COLUMN file_ids TEXT DEFAULT '[]';

-- 4. Триггер для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_files_timestamp
AFTER UPDATE ON files
FOR EACH ROW
BEGIN
  UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 5. Создание таблицы для истории операций с файлами (audit log)
CREATE TABLE IF NOT EXISTS file_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL REFERENCES files(id),
  operation TEXT NOT NULL,               -- 'upload', 'delete', 'update', 'download'
  user_id INTEGER,                       -- Кто выполнил операцию
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,                         -- JSON с дополнительной информацией
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 6. Представление для удобного получения файлов вопросов
CREATE VIEW IF NOT EXISTS question_files AS
SELECT
  q.id as question_id,
  q.question_ru,
  f.id as file_id,
  f.filename,
  f.file_key,
  f.version,
  f.mime_type,
  f.width,
  f.height,
  f.file_size,
  f.storage_provider,
  f.cdn_url,
  f.file_group
FROM questions q
JOIN files f ON f.entity_type = 'question' AND f.entity_id = q.id
WHERE f.deleted_at IS NULL
ORDER BY q.id, f.file_group,
  CASE f.version
    WHEN 'original' THEN 1
    WHEN 'large' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'thumbnail' THEN 4
  END;

-- 7. Функции для работы с файлами

-- Получить все версии файла по group
CREATE VIEW IF NOT EXISTS file_versions AS
SELECT
  file_group,
  MAX(CASE WHEN version = 'original' THEN filename END) as original,
  MAX(CASE WHEN version = 'thumbnail' THEN filename END) as thumbnail,
  MAX(CASE WHEN version = 'medium' THEN filename END) as medium,
  MAX(CASE WHEN version = 'large' THEN filename END) as large,
  MAX(CASE WHEN version = 'original' THEN cdn_url END) as original_url,
  MAX(CASE WHEN version = 'thumbnail' THEN cdn_url END) as thumbnail_url,
  MAX(CASE WHEN version = 'medium' THEN cdn_url END) as medium_url,
  MAX(CASE WHEN version = 'large' THEN cdn_url END) as large_url
FROM files
WHERE deleted_at IS NULL
GROUP BY file_group;

-- ============================================
-- МИГРАЦИЯ СУЩЕСТВУЮЩИХ ДАННЫХ
-- ============================================

-- Если у вас уже есть данные в старом формате (photos JSON),
-- можно мигрировать их с помощью скрипта:
--
-- const questions = await Question.findAll();
-- for (const question of questions) {
--   if (question.photos && question.photos.length > 0) {
--     for (const photo of question.photos) {
--       await File.create({
--         filename: photo.thumbnail,
--         entity_type: 'question',
--         entity_id: question.id,
--         file_type: 'image',
--         mime_type: 'image/webp',
--         version: 'thumbnail',
--         storage_provider: 'local',
--         storage_path: `/uploads/${photo.thumbnail}`,
--         file_group: `q${question.id}_${index}`
--       });
--       // ... аналогично для medium, large, original
--     }
--   }
-- }

-- ============================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================

-- Получить все файлы вопроса #123
-- SELECT * FROM files WHERE entity_type = 'question' AND entity_id = 123;

-- Получить только миниатюры всех вопросов
-- SELECT * FROM files WHERE entity_type = 'question' AND version = 'thumbnail';

-- Получить все версии файла группы q123_1
-- SELECT * FROM file_versions WHERE file_group = 'q123_1';

-- Получить статистику использования хранилища
-- SELECT
--   storage_provider,
--   COUNT(*) as file_count,
--   SUM(file_size) as total_size_bytes,
--   ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb
-- FROM files
-- WHERE deleted_at IS NULL
-- GROUP BY storage_provider;

-- Получить самые большие файлы
-- SELECT
--   filename,
--   ROUND(file_size / 1024.0 / 1024.0, 2) as size_mb,
--   entity_type,
--   entity_id
-- FROM files
-- WHERE deleted_at IS NULL
-- ORDER BY file_size DESC
-- LIMIT 10;
