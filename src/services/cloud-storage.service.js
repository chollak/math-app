const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');

/**
 * Cloud Storage Service
 *
 * Поддерживает:
 * - AWS S3
 * - Cloudflare R2 (S3-совместимый)
 * - DigitalOcean Spaces
 * - Любое S3-совместимое хранилище
 *
 * Для Cloudflare R2:
 * - Дешевле AWS S3 ($0.015/GB vs $0.023/GB)
 * - Бесплатный egress (выгрузка данных)
 * - S3-совместимый API
 */

class CloudStorageService {
  constructor() {
    this.enabled = process.env.CLOUD_STORAGE_ENABLED === 'true';

    if (!this.enabled) {
      console.log('☁️  Cloud storage is disabled. Using local storage.');
      return;
    }

    // Конфигурация S3 клиента
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT, // Для R2: https://ACCOUNT_ID.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
      }
    });

    this.bucket = process.env.S3_BUCKET_NAME;
    this.cdnUrl = process.env.CDN_URL; // Опционально: кастомный CDN URL

    console.log(`☁️  Cloud storage enabled: ${this.bucket}`);
  }

  /**
   * Загрузка файла в облако
   */
  async uploadFile(localPath, key, metadata = {}) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      // Читаем файл
      const fileContent = await fs.readFile(localPath);

      // Определяем Content-Type
      const ext = path.extname(key).toLowerCase();
      const contentType = this.getContentType(ext);

      // Загружаем в S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: metadata,
        // Делаем публичным для чтения (опционально)
        // ACL: 'public-read', // Не рекомендуется для R2
        CacheControl: 'public, max-age=31536000, immutable' // 1 год
      });

      await this.client.send(command);

      console.log(`✅ Uploaded to cloud: ${key}`);

      return this.getPublicUrl(key);

    } catch (error) {
      console.error('Cloud upload error:', error);
      throw new Error(`Failed to upload to cloud storage: ${error.message}`);
    }
  }

  /**
   * Массовая загрузка файлов
   */
  async uploadMultipleFiles(files) {
    const results = [];

    for (const file of files) {
      const url = await this.uploadFile(file.localPath, file.key, file.metadata);
      results.push({
        key: file.key,
        url: url,
        localPath: file.localPath
      });
    }

    return results;
  }

  /**
   * Удаление файла из облака
   */
  async deleteFile(key) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      console.log(`🗑️  Deleted from cloud: ${key}`);

    } catch (error) {
      console.error('Cloud delete error:', error);
      throw new Error(`Failed to delete from cloud storage: ${error.message}`);
    }
  }

  /**
   * Удаление нескольких файлов
   */
  async deleteMultipleFiles(keys) {
    for (const key of keys) {
      await this.deleteFile(key);
    }
  }

  /**
   * Генерация публичного URL
   */
  getPublicUrl(key) {
    if (this.cdnUrl) {
      // Используем кастомный CDN URL
      return `${this.cdnUrl}/${key}`;
    }

    // Стандартный S3 URL
    if (process.env.S3_ENDPOINT) {
      // Для R2 и других совместимых сервисов
      return `${process.env.S3_ENDPOINT}/${this.bucket}/${key}`;
    }

    // AWS S3
    return `https://${this.bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  /**
   * Генерация временного URL для загрузки (Presigned URL)
   * Позволяет клиенту загружать файлы напрямую в S3, минуя бэкенд
   */
  async generatePresignedUploadUrl(key, expiresIn = 3600) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: this.getContentType(path.extname(key))
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      return {
        uploadUrl: url,
        key: key,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      };

    } catch (error) {
      console.error('Presigned URL generation error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Генерация временного URL для скачивания (приватные файлы)
   */
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;

    } catch (error) {
      console.error('Presigned download URL error:', error);
      throw new Error(`Failed to generate presigned download URL: ${error.message}`);
    }
  }

  /**
   * Определение Content-Type по расширению
   */
  getContentType(ext) {
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };

    return types[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Проверка доступности облачного хранилища
   */
  async healthCheck() {
    if (!this.enabled) {
      return { status: 'disabled' };
    }

    try {
      // Пробуем создать и удалить тестовый файл
      const testKey = `health-check-${Date.now()}.txt`;
      const testContent = Buffer.from('health check');

      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: testKey,
        Body: testContent
      }));

      await this.deleteFile(testKey);

      return { status: 'healthy', bucket: this.bucket };

    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new CloudStorageService();
