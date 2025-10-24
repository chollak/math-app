# 📸 Резюме: Правильная работа с файлами для ЕНТ приложения

## 🎯 Ключевые принципы

### 1. **Никогда не храните оригиналы как есть**
```
❌ ПЛОХО: Загрузили 5MB фото → сохранили 5MB → раздаем 5MB всем
✅ ХОРОШО: Загрузили 5MB → сжали до 200KB WebP → раздаем 200KB
```

### 2. **Всегда создавайте версии**
```
Одно фото → 4 версии:
├── thumbnail (200x200, ~30KB)   → для списков
├── medium (800x600, ~150KB)     → для мобильных
├── large (1920x1080, ~500KB)    → для десктопа
└── original (оригинал)          → для архива
```

### 3. **Проверяйте содержимое, а не расширение**
```javascript
// ❌ ОПАСНО
if (filename.endsWith('.jpg')) { }

// ✅ БЕЗОПАСНО
const fileType = await fileTypeFromBuffer(buffer);
if (fileType.mime !== 'image/jpeg') {
  throw new Error('Invalid file');
}
```

### 4. **Используйте облачное хранилище для production**
```
Локальное хранилище → Только для разработки
Облачное (S3/R2) → Production

Почему?
- Файлы не теряются при перезапуске сервера
- CDN для быстрой раздачи
- Автоматический backup
- Масштабируемость
```

---

## 🏗️ Архитектура (упрощенно)

```
┌──────────────┐
│  Пользователь│
└──────┬───────┘
       │ Загружает фото 5MB
       ▼
┌──────────────────────────────┐
│  Backend (Express)           │
│  1. Сохранить во временную   │
│  2. Проверить формат         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Image Service (Sharp)       │
│  1. Убрать EXIF              │
│  2. Создать 4 версии         │
│  3. Сжать в WebP             │
└──────┬───────────────────────┘
       │
       ├─────────┬─────────┬─────────┐
       ▼         ▼         ▼         ▼
    thumb.webp med.webp large.webp orig.jpg
     (30KB)   (150KB)   (500KB)   (4MB)
       │
       ▼
┌──────────────────────────────┐
│  Хранилище                   │
│  • Local: /uploads/          │
│  • Cloud: S3/R2              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  CDN (Cloudflare)            │
│  Раздает файлы пользователям │
│  с кэшированием              │
└──────────────────────────────┘
```

---

## 📊 Схема БД

### Старый подход (ваш текущий):
```sql
questions
├── id: 1
├── question: "Вопрос"
└── photos: '["photo1-123.jpg", "photo2-456.jpg"]'
     └─> JSON массив имен файлов
```

**Проблемы:**
- Нет информации о размерах
- Нет версий (thumbnail/medium/large)
- Нет метаданных (кто загрузил, когда)
- Нельзя быстро найти все файлы пользователя

### Новый подход (рекомендуемый):
```sql
files
├── id: 1
├── filename: "q123_1_thumb_abc.webp"
├── entity_type: "question"
├── entity_id: 123
├── version: "thumbnail"
├── file_size: 30720
├── width: 200
├── height: 200
├── storage_provider: "r2"
├── cdn_url: "https://cdn.example.com/q123_1_thumb_abc.webp"
└── file_group: "q123_1"  ← Связывает версии одного файла

files
├── id: 2
├── filename: "q123_1_medium_abc.webp"
├── entity_type: "question"
├── entity_id: 123
├── version: "medium"
├── file_group: "q123_1"  ← Та же группа!
└── ...

files
├── id: 3
├── filename: "q123_1_large_abc.webp"
├── version: "large"
├── file_group: "q123_1"
└── ...
```

**Преимущества:**
- ✅ Полная информация о каждом файле
- ✅ Удобный поиск и фильтрация
- ✅ Audit log (кто и когда загрузил)
- ✅ Легко мигрировать с local на S3
- ✅ Можно добавить watermark, теги и т.д.

---

## 🚀 Быстрый старт

### Шаг 1: Установка зависимостей
```bash
npm install sharp file-type @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Шаг 2: Настройка .env
```env
# Локальное хранилище (для разработки)
CLOUD_STORAGE_ENABLED=false

# Облачное хранилище (для production)
CLOUD_STORAGE_ENABLED=true
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET_NAME=ent-app-images
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
```

### Шаг 3: Использование в коде
```javascript
const imageService = require('./services/image.service');

// В контроллере создания вопроса
app.post('/api/questions', uploadQuestionPhotos, async (req, res) => {
  // 1. Создать вопрос в БД
  const question = await Question.create({ ... });

  // 2. Обработать фотографии
  if (req.files) {
    const files = [
      ...req.files.photo1 || [],
      ...req.files.photo2 || [],
      ...req.files.photo3 || []
    ];

    const processedPhotos = await imageService.processMultipleImages(
      files,
      `q${question.id}`
    );

    // 3. Сохранить информацию о файлах
    // TODO: сохранить в таблицу files
  }

  res.json({ id: question.id, photos: processedPhotos });
});
```

### Шаг 4: Раздача файлов
```javascript
// Простой вариант (через Express)
app.get('/api/files/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  res.sendFile(filePath);
});

// Улучшенный вариант (с кэшированием)
app.get('/api/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  const stats = await fs.stat(filePath);
  const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

  // Проверка кэша
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified
  }

  res.set({
    'ETag': etag,
    'Cache-Control': 'public, max-age=31536000, immutable'
  });

  res.sendFile(filePath);
});
```

---

## 📈 Сравнение подходов

| Аспект | Текущий (ваш) | Улучшенный |
|--------|---------------|------------|
| **Хранение** | JSON массив | Таблица files |
| **Версии** | Нет | 4 версии (thumb/med/large/orig) |
| **Формат** | JPEG/PNG (большой) | WebP (на 30% меньше) |
| **Валидация** | MIME type | Magic bytes + MIME |
| **EXIF** | Сохраняется (риск приватности) | Удаляется |
| **Метаданные** | Нет | Размер, разрешение, дата |
| **Облако** | Нет | S3/R2 поддержка |
| **CDN** | Нет | Cloudflare CDN |
| **Кэширование** | Нет | ETag, Cache-Control |

---

## 💰 Стоимость (для 10,000 пользователей)

### Локальное хранилище:
- Сервер с 100GB SSD: ~$20/месяц
- Bandwidth 2TB: ~$20/месяц
- **Итого: $40/месяц**
- ❌ Нет резервного копирования
- ❌ Медленная раздача (без CDN)

### Cloudflare R2 + CDN:
- Хранилище 100GB: $1.50/месяц
- Operations: ~$5/месяц
- Egress (CDN): **$0** (бесплатно!)
- **Итого: $6.50/месяц**
- ✅ Автоматический backup
- ✅ Быстрая раздача (CDN)
- ✅ Масштабируемость

**Вывод:** R2 дешевле в 6 раз и лучше!

---

## 🔒 Безопасность - Checklist

- [x] Проверка файла по magic bytes (не только расширение)
- [x] Удаление EXIF данных (GPS координаты, модель камеры)
- [x] Ограничение размера файла (< 10MB)
- [x] Ограничение разрешения (< 4000x4000px)
- [x] Защита от Path Traversal (`../../../etc/passwd`)
- [x] Генерация уникальных имен (не оригинальное имя файла)
- [x] Валидация Content-Type
- [ ] Rate limiting (макс. 10 загрузок в минуту)
- [ ] Virus scanning (ClamAV для production)
- [ ] Watermark (защита авторских прав)

---

## 📝 Частые ошибки

### ❌ Ошибка 1: Раздача через Node.js
```javascript
// ПЛОХО
app.get('/files/:name', (req, res) => {
  res.sendFile(filePath); // Node.js не для этого!
});
```

**Решение:** Nginx или CDN
```nginx
# nginx.conf
location /uploads/ {
  alias /var/www/uploads/;
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### ❌ Ошибка 2: Загрузка без лимитов
```javascript
// ПЛОХО - пользователь может загрузить 1GB файл
app.post('/upload', upload.single('photo'), ...);
```

**Решение:**
```javascript
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});
```

### ❌ Ошибка 3: Хранение оригинальных имен
```javascript
// ПЛОХО
const filename = file.originalname; // "мой файл (копия).jpg"
```

**Решение:**
```javascript
const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.jpg`;
```

---

## 🎓 Дополнительные возможности

### 1. Watermark (защита контента)
```javascript
await sharp(inputPath)
  .composite([{
    input: 'watermark.png',
    gravity: 'southeast'
  }])
  .toFile(outputPath);
```

### 2. Blur для NSFW контента
```javascript
await sharp(inputPath)
  .blur(20)
  .toFile(blurredPath);
```

### 3. Face detection (для автокропа)
```javascript
const faces = await faceapi.detectAllFaces(image);
const crop = calculateCropArea(faces);
await sharp(inputPath).extract(crop).toFile(outputPath);
```

### 4. Optical Character Recognition (OCR)
```javascript
// Для сканированных вопросов
const text = await Tesseract.recognize(imagePath, 'rus+kaz');
```

---

## 📚 Полезные ресурсы

- [Sharp Documentation](https://sharp.pixelplumbing.com/) - обработка изображений
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/) - облачное хранилище
- [WebP vs JPEG](https://developers.google.com/speed/webp/docs/webp_study) - сравнение форматов
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images) - Google Web.dev

---

## ✅ Рекомендации для вашего ЕНТ приложения

### Фаза 1: MVP (сейчас)
- [x] Локальное хранилище
- [ ] Image Service (обработка)
- [ ] 4 версии изображений
- [ ] WebP формат

### Фаза 2: Beta (через 1-2 месяца)
- [ ] Cloudflare R2
- [ ] CDN раздача
- [ ] Таблица files в БД
- [ ] Миграция старых файлов

### Фаза 3: Production (через 3-4 месяца)
- [ ] Автоматический backup
- [ ] Monitoring (размер хранилища)
- [ ] Watermark
- [ ] Video support (для видео-уроков)

---

## 🤔 FAQ

**Q: Нужно ли сразу использовать облачное хранилище?**
A: Нет, для MVP подойдет локальное. Но планируйте миграцию на облако для production.

**Q: Какой формат лучше - WebP или JPEG?**
A: WebP на 30% меньше при том же качестве. Используйте WebP для всего, кроме оригинала.

**Q: Как быстро удалить все файлы вопроса?**
A: С новой схемой БД:
```sql
DELETE FROM files WHERE entity_type = 'question' AND entity_id = 123;
```

**Q: Можно ли хранить PDF файлы?**
A: Да! Просто добавьте MIME type в валидацию:
```javascript
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
```

**Q: Как защититься от вирусов в загруженных файлах?**
A: Используйте ClamAV или облачный сервис (VirusTotal API) для сканирования.

---

## 🎯 Итоговый чеклист

Перед запуском в production убедитесь:

- [ ] Image Service работает (генерация версий)
- [ ] EXIF данные удаляются
- [ ] Валидация по magic bytes
- [ ] Ограничения размера/разрешения
- [ ] Cloudflare R2 настроен
- [ ] CDN работает
- [ ] Кэширование включено (Cache-Control)
- [ ] Таблица files создана
- [ ] Backup настроен
- [ ] Мониторинг включен
- [ ] Документация обновлена
- [ ] Тесты написаны

---

Удачи с разработкой ЕНТ приложения! 🚀
