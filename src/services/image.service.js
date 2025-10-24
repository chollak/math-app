const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { fileTypeFromBuffer } = require('file-type');
const storageConfig = require('../config/storage');

/**
 * Image Processing Service
 * Handles image validation, optimization, and thumbnail generation
 */

class ImageService {
  constructor() {
    // Конфигурация версий изображений
    this.versions = {
      thumbnail: { width: 200, height: 200, fit: 'cover' },
      medium: { width: 800, height: 600, fit: 'inside' },
      large: { width: 1920, height: 1080, fit: 'inside' }
    };

    // Разрешенные форматы
    this.allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];

    // Максимальные размеры оригинала
    this.maxDimensions = {
      width: 4000,
      height: 4000
    };
  }

  /**
   * Валидация файла по реальному содержимому (не только MIME)
   */
  async validateImage(filePath) {
    try {
      // Читаем первые байты файла
      const buffer = await fs.readFile(filePath);

      // Проверяем реальный формат по magic bytes
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType || !this.allowedFormats.includes(fileType.mime)) {
        throw new Error(`Invalid file format. Expected: ${this.allowedFormats.join(', ')}`);
      }

      // Проверяем метаданные изображения
      const metadata = await sharp(buffer).metadata();

      // Проверка размеров
      if (metadata.width > this.maxDimensions.width ||
          metadata.height > this.maxDimensions.height) {
        throw new Error(
          `Image too large. Max dimensions: ${this.maxDimensions.width}x${this.maxDimensions.height}px`
        );
      }

      return {
        valid: true,
        format: fileType.mime,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length
      };

    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  /**
   * Генерация уникального имени файла
   */
  generateFileName(prefix, version, format = 'webp') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${version}_${timestamp}_${random}.${format}`;
  }

  /**
   * Обработка и создание всех версий изображения
   * @param {string} inputPath - путь к загруженному файлу
   * @param {string} prefix - префикс для имени (например, 'q123' для question_id=123)
   * @returns {Object} - пути к созданным файлам
   */
  async processImage(inputPath, prefix) {
    try {
      // 1. Валидация
      const validation = await this.validateImage(inputPath);
      console.log('✅ Image validated:', validation);

      const results = {
        original: null,
        thumbnail: null,
        medium: null,
        large: null,
        metadata: validation
      };

      // 2. Сохранение оптимизированного оригинала
      const originalName = this.generateFileName(prefix, 'orig', 'jpg');
      const originalPath = path.join(storageConfig.uploadsPath, originalName);

      await sharp(inputPath)
        .rotate() // Автоповорот по EXIF
        .withMetadata({
          // Удаляем GPS и личные данные, оставляем ориентацию
          exif: {}
        })
        .jpeg({ quality: 90, mozjpeg: true })
        .toFile(originalPath);

      results.original = originalName;

      // 3. Генерация всех версий
      for (const [version, config] of Object.entries(this.versions)) {
        const fileName = this.generateFileName(prefix, version, 'webp');
        const outputPath = path.join(storageConfig.uploadsPath, fileName);

        await sharp(inputPath)
          .rotate()
          .resize(config.width, config.height, {
            fit: config.fit,
            withoutEnlargement: true // Не увеличивать маленькие изображения
          })
          .webp({ quality: 85 })
          .toFile(outputPath);

        results[version] = fileName;
        console.log(`✅ Generated ${version}: ${fileName}`);
      }

      // 4. Удаляем временный файл
      await fs.unlink(inputPath);

      return results;

    } catch (error) {
      // В случае ошибки удаляем временный файл
      try {
        await fs.unlink(inputPath);
      } catch {}

      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Массовая обработка нескольких изображений
   */
  async processMultipleImages(files, prefix) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePrefix = `${prefix}_${i + 1}`;

      try {
        const processed = await this.processImage(file.path, filePrefix);
        results.push(processed);
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Удаление всех версий изображения
   */
  async deleteImage(imageObject) {
    const versions = ['original', 'thumbnail', 'medium', 'large'];

    for (const version of versions) {
      if (imageObject[version]) {
        const filePath = path.join(storageConfig.uploadsPath, imageObject[version]);

        try {
          await fs.unlink(filePath);
          console.log(`🗑️  Deleted ${version}: ${imageObject[version]}`);
        } catch (error) {
          console.error(`Failed to delete ${version}:`, error.message);
        }
      }
    }
  }

  /**
   * Получение URL для версии изображения
   */
  getImageUrl(filename, baseUrl = '') {
    if (!filename) return null;
    return `${baseUrl}/api/files/${filename}`;
  }

  /**
   * Генерация полного объекта URL для всех версий
   */
  getImageUrls(imageObject, baseUrl = '') {
    if (!imageObject) return null;

    return {
      original: this.getImageUrl(imageObject.original, baseUrl),
      thumbnail: this.getImageUrl(imageObject.thumbnail, baseUrl),
      medium: this.getImageUrl(imageObject.medium, baseUrl),
      large: this.getImageUrl(imageObject.large, baseUrl)
    };
  }
}

module.exports = new ImageService();
