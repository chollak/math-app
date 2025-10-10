# Math App API - План проекта

## Описание
REST API для приложения подготовки к экзаменам с поддержкой вопросов на двух языках (русский/казахский), множественных вариантов ответов и изображений.

## Технический стек
- **Backend**: Node.js + Express
- **База данных**: SQLite
- **Загрузка файлов**: Multer
- **CORS**: для поддержки iOS приложения

## Структура проекта
```
math-app/
├── src/
│   ├── config/
│   │   └── database.js          # Конфигурация SQLite
│   ├── models/
│   │   ├── Question.js          # Модель вопросов
│   │   └── AnswerOption.js      # Модель вариантов ответов
│   ├── routes/
│   │   ├── questions.js         # Роуты для вопросов
│   │   └── files.js             # Роуты для файлов
│   ├── controllers/
│   │   └── questionController.js # Контроллер вопросов
│   ├── middleware/
│   │   └── upload.js            # Middleware для загрузки файлов
│   └── app.js                   # Главный файл приложения
├── uploads/                     # Папка для изображений
├── database/                    # Папка для SQLite файла
├── package.json
└── PROJECT_PLAN.md
```

## База данных

### Таблица `questions`
```sql
- id (INTEGER PRIMARY KEY)
- question_ru (TEXT)           # Вопрос на русском
- question_kz (TEXT)           # Вопрос на казахском  
- answer (TEXT)                # Правильные ответы (например: "A,C,F")
- level (INTEGER)              # Уровень сложности
- context (TEXT)               # Дополнительный контекст
- context_title (TEXT)         # Заголовок контекста
- topic (TEXT)                 # Тема
- photo1_path (TEXT)           # Путь к первому изображению
- photo2_path (TEXT)           # Путь ко второму изображению
- photo3_path (TEXT)           # Путь к третьему изображению
- created_at (DATETIME)
- updated_at (DATETIME)
```

### Таблица `answer_options`
```sql
- id (INTEGER PRIMARY KEY)
- question_id (INTEGER)        # Внешний ключ на questions
- option_letter (TEXT)         # Буква варианта (A-M)
- option_text_ru (TEXT)        # Текст варианта на русском
- option_text_kz (TEXT)        # Текст варианта на казахском
- order_index (INTEGER)        # Порядок отображения
```

## API Endpoints

### Создание вопроса
```
POST /api/questions
Content-Type: multipart/form-data

FormData {
  question_ru: "Сколько будет 2+2?",
  question_kz: "2+2 нешеу болады?",
  answer: "B",
  level: "1",
  topic: "Математика",
  context: "Простое сложение",
  context_title: "Арифметика",
  options: '[
    {"option_text_ru": "3", "option_text_kz": "3"},
    {"option_text_ru": "4", "option_text_kz": "4"},
    {"option_text_ru": "5", "option_text_kz": "5"}
  ]',
  photo1: File,    // необязательно
  photo2: File,    // необязательно  
  photo3: File     // необязательно
}

Response: {
  "question": {...},
  "options": [...]
}
```

### Получение всех вопросов
```
GET /api/questions

Response: [
  {
    "id": 1,
    "question_ru": "Сколько будет 2+2?",
    "question_kz": "2+2 нешеу болады?",
    "answer": "B",
    "level": 1,
    "topic": "Математика",
    "photo1_path": "photo1-123456.jpg",
    "options": [
      {
        "id": 1,
        "option_letter": "A",
        "option_text_ru": "3",
        "option_text_kz": "3",
        "order_index": 0
      },
      ...
    ]
  }
]
```

### Получение файлов
```
GET /api/files/:filename

Response: изображение
```

### Другие endpoints
```
GET /api/questions/:id    # Получить конкретный вопрос
GET /health               # Проверка состояния API
GET /                     # Документация API
```

## Ключевые особенности

### Мультиязычность
- Поддержка русского (ru) и казахского (kz) языков
- Поля для языков необязательные - можно создать вопрос только на одном языке
- Перевод может быть добавлен позже

### Автогенерация букв вариантов
- Если `option_letter` не указан, автоматически присваиваются буквы A, B, C, ..., M
- Максимум 13 вариантов ответов

### Множественные правильные ответы
- Поле `answer` может содержать несколько букв через запятую: "A,C,F"
- Поддерживает вопросы с одним или несколькими правильными ответами

### Загрузка изображений
- До 3 изображений на вопрос
- Максимальный размер файла: 5MB
- Поддерживаемые форматы: JPEG, PNG, WebP
- Файлы сохраняются с уникальными именами

### Валидация
- Проверка обязательных полей
- Проверка формата файлов
- Ограничение количества вариантов ответов (максимум 13)

## Команды для запуска

### Установка зависимостей
```bash
npm install
```

### Запуск сервера
```bash
npm start
# или
npm run dev
```

Сервер запустится на порту 3000:
- API: http://localhost:3000
- Health check: http://localhost:3000/health

## Примеры использования

### Создание вопроса с изображением (cURL)
```bash
curl -X POST http://localhost:3000/api/questions \
  -F 'question_ru=Что изображено на картинке?' \
  -F 'answer=A' \
  -F 'level=2' \
  -F 'topic=Геометрия' \
  -F 'options=[{"option_text_ru":"Треугольник"},{"option_text_ru":"Квадрат"}]' \
  -F 'photo1=@image.jpg'
```

### Получение всех вопросов (cURL)
```bash
curl http://localhost:3000/api/questions
```

## Планы на будущее (не в MVP)
- Аутентификация и авторизация
- Массовая загрузка вопросов
- Статистика ответов пользователей
- Категории и теги
- Полнотекстовый поиск
- Экспорт вопросов в различные форматы
- Версионирование вопросов

## Статус проекта
✅ MVP готов к тестированию и использованию iOS приложением