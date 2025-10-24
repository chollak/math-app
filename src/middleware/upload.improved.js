const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storageConfig = require('../config/storage');

/**
 * Улучшенный middleware для загрузки файлов
 *
 * Изменения:
 * 1. Сохраняет во временную папку (не в финальную)
 * 2. Сохраняет оригинальное имя для лучшей диагностики
 * 3. Добавляет дополнительные проверки
 */

// Временная папка для загрузки (перед обработкой)
const tempUploadsDir = storageConfig.tempPath;

// Настройка хранилища
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Сохраняем во временную папку
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    // Генерируем временное имя
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9]/g, '_') // Убираем спецсимволы
      .substring(0, 30); // Ограничиваем длину

    cb(null, `temp_${basename}_${uniqueSuffix}${extension}`);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
  }
};

// Основная конфигурация multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (разрешаем больше, т.к. будем сжимать)
    files: 5, // До 5 файлов
    fields: 20, // Макс. количество полей формы
    fieldSize: 1024 * 1024 // 1MB для текстовых полей
  }
});

// Middleware для загрузки фото вопросов
const uploadQuestionPhotos = upload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 },
  { name: 'photos', maxCount: 5 } // Альтернативный вариант - массив
]);

// Middleware для загрузки фото контекстов
const uploadContextPhotos = upload.fields([
  { name: 'photo1', maxCount: 1 },
  { name: 'photo2', maxCount: 1 },
  { name: 'photo3', maxCount: 1 }
]);

// Middleware для загрузки одного файла
const uploadSinglePhoto = upload.single('photo');

// Middleware для очистки старых временных файлов
const cleanupTempFiles = async (req, res, next) => {
  // Очищаем файлы старше 1 часа
  const ONE_HOUR = 60 * 60 * 1000;

  try {
    const files = await fs.promises.readdir(tempUploadsDir);
    const now = Date.now();

    for (const file of files) {
      if (!file.startsWith('temp_')) continue;

      const filePath = path.join(tempUploadsDir, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtimeMs > ONE_HOUR) {
        await fs.promises.unlink(filePath);
        console.log(`🗑️  Cleaned up old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Temp file cleanup error:', error);
  }

  next();
};

// Error handler для multer ошибок
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: 'Maximum file size is 10MB',
          code: 'FILE_TOO_LARGE'
        });

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Maximum 5 files allowed',
          code: 'TOO_MANY_FILES'
        });

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file field',
          message: `Unexpected field: ${err.field}`,
          code: 'UNEXPECTED_FIELD'
        });

      default:
        return res.status(400).json({
          error: 'Upload error',
          message: err.message,
          code: err.code
        });
    }
  }

  if (err) {
    return res.status(400).json({
      error: 'Upload failed',
      message: err.message
    });
  }

  next();
};

module.exports = {
  uploadQuestionPhotos,
  uploadContextPhotos,
  uploadSinglePhoto,
  cleanupTempFiles,
  handleUploadErrors
};
