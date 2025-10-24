const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const storageConfig = require('../config/storage');

/**
 * Улучшенная раздача файлов с:
 * - HTTP кэшированием
 * - ETag поддержкой
 * - Content-Type определением
 * - Безопасностью (path traversal защита)
 * - Поддержкой Range запросов (для больших файлов)
 */

// MIME types
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// Cache duration (1 год для immutable файлов)
const CACHE_DURATION = 365 * 24 * 60 * 60; // 1 год в секундах

/**
 * GET /api/files/:filename
 * Получение файла с кэшированием
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Безопасность: проверка на path traversal атаки
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Полный путь к файлу
    const filePath = path.join(storageConfig.uploadsPath, filename);

    // Проверка существования
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Получаем метаданные файла
    const stats = await fs.stat(filePath);

    // Определяем MIME type
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // ETag для кэширования (основан на mtime и size)
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

    // Проверка If-None-Match (ETag кэш)
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end(); // Not Modified
    }

    // Заголовки кэширования
    res.set({
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'ETag': etag,
      'Cache-Control': `public, max-age=${CACHE_DURATION}, immutable`,
      'Last-Modified': stats.mtime.toUTCString(),
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin' // Разрешаем использование с других доменов
    });

    // Проверка Range запроса (для больших файлов)
    const range = req.headers.range;
    if (range) {
      return handleRangeRequest(req, res, filePath, stats, contentType);
    }

    // Отправляем файл
    res.sendFile(filePath);

  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

/**
 * Обработка Range запросов (для больших файлов или видео)
 */
async function handleRangeRequest(req, res, filePath, stats, contentType) {
  const range = req.headers.range;
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
  const chunkSize = (end - start) + 1;

  if (start >= stats.size || end >= stats.size) {
    res.status(416).set({
      'Content-Range': `bytes */${stats.size}`
    });
    return res.end();
  }

  res.status(206).set({
    'Content-Type': contentType,
    'Content-Length': chunkSize,
    'Content-Range': `bytes ${start}-${end}/${stats.size}`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': `public, max-age=${CACHE_DURATION}`
  });

  const fileStream = require('fs').createReadStream(filePath, { start, end });
  fileStream.pipe(res);
}

/**
 * GET /api/files/optimize/:filename
 * Получение оптимизированной версии (WebP) на лету
 * Полезно для старых изображений, которые еще не обработаны
 */
router.get('/optimize/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { width, height, quality = 85 } = req.query;

    // Безопасность
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(storageConfig.uploadsPath, filename);

    // Проверка существования
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    const sharp = require('sharp');
    let transformer = sharp(filePath);

    // Изменение размера если запрошено
    if (width || height) {
      transformer = transformer.resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        { fit: 'inside', withoutEnlargement: true }
      );
    }

    // Конвертация в WebP
    transformer = transformer.webp({ quality: parseInt(quality) });

    // Заголовки
    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': `public, max-age=${CACHE_DURATION}`,
      'X-Content-Type-Options': 'nosniff'
    });

    // Отправляем оптимизированное изображение
    const buffer = await transformer.toBuffer();
    res.send(buffer);

  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize image' });
  }
});

/**
 * DELETE /api/files/:filename
 * Удаление файла (требует авторизации)
 */
router.delete('/:filename', async (req, res) => {
  try {
    // TODO: Добавить проверку авторизации
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }

    const { filename } = req.params;

    // Безопасность
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(storageConfig.uploadsPath, filename);

    // Удаляем файл
    await fs.unlink(filePath);

    res.json({ message: 'File deleted successfully', filename });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }

    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
