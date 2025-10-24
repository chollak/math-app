# 📸 Руководство по работе с файлами и изображениями

## 📋 Содержание
1. [Архитектура](#архитектура)
2. [Локальное хранилище](#локальное-хранилище)
3. [Облачное хранилище (S3/R2)](#облачное-хранилище)
4. [Примеры использования](#примеры-использования)
5. [Оптимизация](#оптимизация)
6. [Безопасность](#безопасность)

---

## 🏗️ Архитектура

### Процесс загрузки файла:

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │
       │ POST /api/questions
       │ Content-Type: multipart/form-data
       │ { question: "...", photo1: File }
       ▼
┌────────────────────────────────┐
│   Upload Middleware            │
│  - Валидация MIME type         │
│  - Проверка размера (< 10MB)   │
│  - Сохранение в temp/          │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│   Question Controller          │
│  - Создание вопроса в БД       │
│  - Получение question_id       │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│   Image Service                │
│  1. Валидация (magic bytes)    │
│  2. Удаление EXIF              │
│  3. Генерация версий:          │
│     - thumbnail: 200x200       │
│     - medium: 800x600          │
│     - large: 1920x1080         │
│     - original: оптимизация    │
│  4. Сохранение в uploads/      │
│     или загрузка в S3          │
└──────┬─────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│   Database                     │
│  UPDATE questions              │
│  SET photos = JSON([...])      │
│  WHERE id = question_id        │
└────────────────────────────────┘
```

---

## 💾 Локальное хранилище

### Структура директорий:

```
math-app/
├── database/
│   ├── database.sqlite
│   └── uploads/                # Финальные файлы
│       ├── q1_orig_123.jpg
│       ├── q1_thumb_123.webp
│       ├── q1_med_123.webp
│       └── q1_large_123.webp
├── temp/                       # Временные файлы
│   └── temp_upload_456.jpg
└── public/
    └── images/                 # Статические изображения (лого и т.д.)
```

### Формат хранения в БД:

```json
{
  "photos": [
    {
      "original": "q123_orig_1234567890_abc123.jpg",
      "thumbnail": "q123_thumb_1234567890_abc123.webp",
      "medium": "q123_med_1234567890_abc123.webp",
      "large": "q123_large_1234567890_abc123.webp"
    }
  ]
}
```

### Получение файлов:

```javascript
// Миниатюра для списка вопросов
GET /api/files/q123_thumb_1234567890_abc123.webp

// Средний размер для просмотра на мобильном
GET /api/files/q123_med_1234567890_abc123.webp

// Большой размер для полноэкранного просмотра
GET /api/files/q123_large_1234567890_abc123.webp

// Оригинал (только для админов)
GET /api/files/q123_orig_1234567890_abc123.jpg
```

---

## ☁️ Облачное хранилище

### Поддерживаемые провайдеры:

- **AWS S3** - стандартный выбор
- **Cloudflare R2** - дешевле, бесплатный egress
- **DigitalOcean Spaces** - S3-совместимый
- **Backblaze B2** - дешевое хранилище
- **MinIO** - self-hosted S3

### Настройка Cloudflare R2 (рекомендуется):

#### 1. Создание bucket в Cloudflare:

1. Зайдите в Cloudflare Dashboard
2. R2 → Create bucket → `ent-app-images`
3. Settings → Public Access → Allow

#### 2. Получение API ключей:

1. R2 → Manage R2 API Tokens
2. Create API Token
3. Сохраните: `Access Key ID` и `Secret Access Key`

#### 3. Настройка .env:

```env
# Cloud Storage Configuration
CLOUD_STORAGE_ENABLED=true
CLOUD_STORAGE_PROVIDER=r2  # or 's3', 'spaces'

# Cloudflare R2
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET_NAME=ent-app-images
S3_ACCESS_KEY_ID=your_access_key_here
S3_SECRET_ACCESS_KEY=your_secret_key_here

# CDN URL (optional, for custom domain)
CDN_URL=https://cdn.yourdomain.com
```

#### 4. Использование в коде:

```javascript
const cloudStorage = require('./services/cloud-storage.service');
const imageService = require('./services/image.service');

// Обработка и загрузка в облако
const processedPhotos = await imageService.processMultipleImages(files, 'q123');

// Загрузка всех версий в R2
for (const photo of processedPhotos) {
  await cloudStorage.uploadFile(
    path.join(uploadsPath, photo.thumbnail),
    `questions/q123/${photo.thumbnail}`
  );

  await cloudStorage.uploadFile(
    path.join(uploadsPath, photo.medium),
    `questions/q123/${photo.medium}`
  );

  // ... и т.д.
}
```

### Сравнение стоимости:

| Провайдер | Хранение (GB/месяц) | Egress (GB) | Итого (100GB хранение + 1TB egress) |
|-----------|---------------------|-------------|--------------------------------------|
| AWS S3    | $0.023              | $0.09       | ~$92/месяц                           |
| Cloudflare R2 | $0.015          | **$0.00**   | ~$1.50/месяц 🎉                      |
| DigitalOcean | $0.02            | $0.01       | ~$12/месяц                           |

**Вывод:** Cloudflare R2 - лучший выбор для ЕНТ приложения!

---

## 📚 Примеры использования

### Пример 1: Создание вопроса с 3 фотографиями

```bash
curl -X POST http://localhost:3000/api/questions \
  -F 'question_ru=Что изображено на рисунке?' \
  -F 'question_kz=Суретте не бейнеленген?' \
  -F 'language=ru' \
  -F 'subject_id=4' \
  -F 'topic_id=10112' \
  -F 'answer=A' \
  -F 'difficulty=3' \
  -F 'options=[{"text_ru":"Треугольник"},{"text_ru":"Квадрат"}]' \
  -F 'photo1=@graph1.jpg' \
  -F 'photo2=@graph2.png' \
  -F 'photo3=@diagram.webp'
```

**Ответ:**

```json
{
  "id": 123,
  "question": "Что изображено на рисунке?",
  "language": "ru",
  "answer": "A",
  "photos": [
    {
      "original": "http://localhost:3000/api/files/q123_1_orig_1234567890_abc.jpg",
      "thumbnail": "http://localhost:3000/api/files/q123_1_thumb_1234567890_abc.webp",
      "medium": "http://localhost:3000/api/files/q123_1_med_1234567890_abc.webp",
      "large": "http://localhost:3000/api/files/q123_1_large_1234567890_abc.webp"
    },
    {
      "original": "http://localhost:3000/api/files/q123_2_orig_1234567891_def.jpg",
      "thumbnail": "http://localhost:3000/api/files/q123_2_thumb_1234567891_def.webp",
      "medium": "http://localhost:3000/api/files/q123_2_med_1234567891_def.webp",
      "large": "http://localhost:3000/api/files/q123_2_large_1234567891_def.webp"
    },
    {
      "original": "http://localhost:3000/api/files/q123_3_orig_1234567892_ghi.jpg",
      "thumbnail": "http://localhost:3000/api/files/q123_3_thumb_1234567892_ghi.webp",
      "medium": "http://localhost:3000/api/files/q123_3_med_1234567892_ghi.webp",
      "large": "http://localhost:3000/api/files/q123_3_large_1234567892_ghi.webp"
    }
  ],
  "options": ["Треугольник", "Квадрат"]
}
```

### Пример 2: Frontend (JavaScript) - загрузка с preview

```javascript
// HTML
<form id="questionForm">
  <input type="text" name="question_ru" placeholder="Вопрос">
  <input type="file" name="photo1" accept="image/*" id="photo1">
  <img id="preview1" style="max-width: 200px;">
  <button type="submit">Создать</button>
</form>

// JavaScript
document.getElementById('photo1').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    // Preview перед загрузкой
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('preview1').src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('questionForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  formData.append('subject_id', '4');
  formData.append('topic_id', '10112');
  formData.append('answer', 'A');
  formData.append('options', JSON.stringify([
    { text_ru: "Вариант A" },
    { text_ru: "Вариант B" }
  ]));

  try {
    const response = await fetch('/api/questions', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('Вопрос создан:', result);

    // Показываем миниатюру
    if (result.photos && result.photos.length > 0) {
      document.getElementById('preview1').src = result.photos[0].thumbnail;
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
});
```

### Пример 3: Оптимизация на лету

```javascript
// Получить изображение с изменением размера
GET /api/files/optimize/q123_orig_abc.jpg?width=400&height=300&quality=80

// Вернет WebP изображение 400x300px с качеством 80%
```

### Пример 4: Presigned URL (прямая загрузка в S3)

```javascript
// Backend - генерация URL
app.post('/api/upload/presigned-url', async (req, res) => {
  const { filename, contentType } = req.body;
  const key = `questions/${Date.now()}_${filename}`;

  const presignedData = await cloudStorage.generatePresignedUploadUrl(key);

  res.json(presignedData);
});

// Frontend - прямая загрузка
async function uploadToS3(file) {
  // 1. Получаем presigned URL
  const response = await fetch('/api/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type
    })
  });

  const { uploadUrl, key } = await response.json();

  // 2. Загружаем напрямую в S3 (минуя backend!)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  // 3. Сообщаем backend, что файл загружен
  await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_ru: "Вопрос...",
      photo_key: key  // Ключ загруженного файла
    })
  });
}
```

---

## ⚡ Оптимизация

### 1. Форматы изображений:

- **WebP** - лучший выбор (на 30% меньше JPEG при том же качестве)
- **JPEG** - для старых браузеров
- **PNG** - только для изображений с прозрачностью

### 2. Ленивая загрузка (Lazy Loading):

```html
<img
  src="placeholder.jpg"
  data-src="q123_large.webp"
  loading="lazy"
  alt="Вопрос"
>
```

### 3. Responsive Images:

```html
<picture>
  <source
    srcset="q123_large.webp"
    media="(min-width: 1024px)"
    type="image/webp"
  >
  <source
    srcset="q123_med.webp"
    media="(min-width: 640px)"
    type="image/webp"
  >
  <img
    src="q123_thumb.webp"
    alt="Вопрос"
  >
</picture>
```

### 4. CDN кэширование:

```
Cache-Control: public, max-age=31536000, immutable
```

- `public` - может кэшироваться CDN
- `max-age=31536000` - кэш на 1 год
- `immutable` - файл никогда не изменится

---

## 🔒 Безопасность

### 1. Валидация файлов:

```javascript
// ❌ ПЛОХО - проверка только расширения
if (filename.endsWith('.jpg')) { ... }

// ✅ ХОРОШО - проверка magic bytes
const fileType = await fileTypeFromBuffer(buffer);
if (fileType.mime !== 'image/jpeg') {
  throw new Error('Invalid file type');
}
```

### 2. Удаление EXIF данных:

```javascript
// EXIF может содержать GPS координаты, модель камеры и т.д.
await sharp(inputPath)
  .withMetadata({ exif: {} })  // Удаляем все EXIF
  .toFile(outputPath);
```

### 3. Ограничение размеров:

```javascript
// Проверка размера файла
if (fileSize > 10 * 1024 * 1024) {
  throw new Error('File too large');
}

// Проверка разрешения
if (width > 4000 || height > 4000) {
  throw new Error('Image resolution too high');
}
```

### 4. Защита от Path Traversal:

```javascript
// ❌ ОПАСНО
const filePath = path.join(uploadsDir, req.params.filename);

// ✅ БЕЗОПАСНО
const filename = req.params.filename;
if (filename.includes('..') || filename.includes('/')) {
  return res.status(400).json({ error: 'Invalid filename' });
}
const filePath = path.join(uploadsDir, filename);
```

### 5. Приватные файлы:

```javascript
// Для конфиденциальных файлов используйте signed URLs
const signedUrl = await cloudStorage.generatePresignedDownloadUrl(
  fileKey,
  3600  // URL действителен 1 час
);

// Вместо публичного URL
// https://cdn.example.com/private-file.jpg

// Возвращаем временный URL
// https://cdn.example.com/private-file.jpg?signature=...&expires=...
```

---

## 📊 Мониторинг

### Метрики для отслеживания:

1. **Размер хранилища** - сколько места занимают файлы
2. **Bandwidth** - трафик загрузки/выгрузки
3. **Количество запросов** - сколько раз файлы запрашиваются
4. **Cache Hit Rate** - процент попаданий в кэш CDN

### Пример healthcheck:

```javascript
app.get('/admin/storage-stats', async (req, res) => {
  const uploadsDir = storageConfig.uploadsPath;
  const files = await fs.readdir(uploadsDir);

  let totalSize = 0;
  for (const file of files) {
    const stats = await fs.stat(path.join(uploadsDir, file));
    totalSize += stats.size;
  }

  res.json({
    totalFiles: files.length,
    totalSizeBytes: totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    cloudStorageEnabled: cloudStorage.enabled,
    cloudStatus: await cloudStorage.healthCheck()
  });
});
```

---

## 🚀 Рекомендации для production

1. **Используйте CDN** (Cloudflare, CloudFront)
2. **Включите облачное хранилище** (R2/S3)
3. **Настройте backup** файлов
4. **Мониторинг** размера хранилища
5. **Автоочистка** старых временных файлов
6. **Watermark** для защиты авторских прав (опционально)

---

## 📝 Checklist перед production

- [ ] Облачное хранилище настроено
- [ ] CDN настроен и работает
- [ ] Backup настроен (ежедневный)
- [ ] Мониторинг включен
- [ ] Ограничения файлов настроены
- [ ] EXIF данные удаляются
- [ ] Валидация по magic bytes работает
- [ ] Cache headers настроены
- [ ] Тесты покрывают загрузку файлов
- [ ] Документация обновлена
