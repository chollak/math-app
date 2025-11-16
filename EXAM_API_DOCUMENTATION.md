# Exam System API Documentation (для iOS разработчика)

## Обзор

Система экзаменов позволяет:
- Создавать рандомные экзамены с заданным количеством вопросов
- Получать вопросы для экзамена
- Отправлять все ответы разом при завершении
- Просматривать историю экзаменов
- Получать статистику по результатам

**Важно:** Все API endpoints возвращают данные в **camelCase** формате для удобства iOS разработки!

---

## Система баллов

### Логика начисления баллов:

1. **1 правильный ответ**
   - Полностью правильно = **1 балл**
   - Неправильно = **0 баллов**

2. **2 правильных ответа**
   - Оба правильно = **2 балла**
   - 1 из 2 правильно = **1 балл**
   - 0 правильных = **0 баллов**

3. **3+ правильных ответа**
   - Все правильно = **2 балла**
   - 2 из 3+ правильно = **1 балл**
   - 1 или 0 правильных = **0 баллов**

**Лишние неправильные ответы игнорируются** (засчитываются частичные баллы за правильные).

### Примеры:
```
Правильный ответ: "A,C"
Пользователь выбрал: "A,C,D" → 2 балла (игнорируем D)
Пользователь выбрал: "A" → 1 балл
Пользователь выбрал: "B,D" → 0 баллов

Правильный ответ: "A,B,D"
Пользователь выбрал: "A,B,D" → 2 балла
Пользователь выбрал: "A,B" → 1 балл
Пользователь выбрал: "A" → 0 баллов
```

---

## API Endpoints

### 1. Начать новый экзамен

```http
POST /api/exams/start
Content-Type: application/json
```

**Request Body (camelCase):**
```json
{
  "deviceId": "iPhone-UUID-12345",
  "questionCount": 45,
  "filters": {
    "topic": "Математика",
    "level": 2
  }
}
```

**Parameters:**
- `deviceId` (string, обязательно) - Уникальный ID устройства (UUID)
- `questionCount` (number, optional, default: 45) - Количество вопросов (1-200)
- `filters` (object, optional) - Фильтры для выбора вопросов
  - `filters.topic` (string, optional) - Тема вопросов
  - `filters.level` (number, optional) - Уровень сложности

**Response (200 OK):**
```json
{
  "examId": 1,
  "deviceId": "iPhone-UUID-12345",
  "totalQuestions": 45,
  "questionIds": [12, 5, 33, ...],
  "startedAt": "2025-10-23 12:00:00",
  "status": "in_progress"
}
```

**Errors:**
- `400` - deviceId отсутствует или questionCount некорректен
- `400` - Нет доступных вопросов
- `500` - Ошибка сервера

---

### 2. Получить вопросы экзамена

```http
GET /api/exams/{examId}/questions
```

**Parameters:**
- `examId` (number, в URL) - ID экзамена

**Response (200 OK):**
```json
[
  {
    "order": 1,
    "questionId": 12,
    "question": "Сколько будет 2+2?",
    "language": "ru",
    "topic": "Математика",
    "level": 1,
    "photos": ["photo1.jpg", "photo2.jpg"],
    "options": [
      {
        "id": 45,
        "questionId": 12,
        "optionLetter": "A",
        "optionTextRu": "3",
        "optionTextKz": "3",
        "orderIndex": 0,
        "suboptions": []
      },
      {
        "id": 46,
        "questionId": 12,
        "optionLetter": "B",
        "optionTextRu": "4",
        "optionTextKz": "4",
        "orderIndex": 1,
        "suboptions": []
      }
    ],
    "context": {
      "id": 5,
      "text": "Прочитайте текст...",
      "title": "Задача про яблоки",
      "photos": ["context1.jpg"]
    },
    "maxPoints": 1
  },
  {
    "order": 2,
    "questionId": 5,
    "question": "Какие числа четные?",
    "language": "ru",
    "topic": "Математика",
    "level": 2,
    "photos": [],
    "options": [...],
    "context": null,
    "maxPoints": 2
  }
]
```

**Errors:**
- `400` - Некорректный examId
- `404` - Экзамен не найден
- `500` - Ошибка сервера

---

### 3. Отправить ответы и завершить экзамен

```http
POST /api/exams/{examId}/submit
Content-Type: application/json
```

**Request Body (camelCase):**
```json
{
  "deviceId": "iPhone-UUID-12345",
  "answers": [
    {
      "questionId": 12,
      "answer": "B"
    },
    {
      "questionId": 5,
      "answer": "A,C"
    },
    {
      "questionId": 33,
      "answer": "A,B,D"
    }
  ]
}
```

**Parameters:**
- `deviceId` (string, обязательно) - ID устройства для проверки
- `answers` (array, обязательно) - Массив ответов
  - `answers[].questionId` (number) - ID вопроса
  - `answers[].answer` (string) - Ответ в формате "A" или "A,C,F"

**Response (200 OK):**
```json
{
  "exam": {
    "id": 1,
    "deviceId": "iPhone-UUID-12345",
    "startedAt": "2025-10-23 12:00:00",
    "completedAt": "2025-10-23 12:45:30",
    "durationSeconds": 2730,
    "totalQuestions": 45,
    "totalPoints": 78,
    "maxPossiblePoints": 90,
    "scorePercentage": 86.67,
    "status": "completed"
  },
  "questions": [
    {
      "questionId": 12,
      "questionOrder": 1,
      "userAnswer": "B",
      "correctAnswer": "B",
      "pointsEarned": 1,
      "maxPoints": 1,
      "question": "Сколько будет 2+2?",
      "language": "ru",
      "topic": "Математика",
      "level": 1
    },
    {
      "questionId": 5,
      "questionOrder": 2,
      "userAnswer": "A,C",
      "correctAnswer": "A,C",
      "pointsEarned": 2,
      "maxPoints": 2,
      "question": "Какие числа четные?",
      "language": "ru",
      "topic": "Математика",
      "level": 2
    }
  ]
}
```

**Errors:**
- `400` - Некорректный examId или отсутствует deviceId
- `403` - Экзамен не принадлежит этому устройству
- `404` - Экзамен не найден
- `400` - Экзамен уже завершен
- `500` - Ошибка сервера

---

### 4. Получить историю экзаменов

```http
GET /api/exams/history/{deviceId}?startDate={startDate}&endDate={endDate}&dateField={dateField}&limit={limit}
```

**Parameters:**
- `deviceId` (string, в URL) - ID устройства
- `startDate` (string, query, optional) - Начальная дата фильтра (формат: YYYY-MM-DD или YYYY-MM-DDTHH:MM:SS)
- `endDate` (string, query, optional) - Конечная дата фильтра (формат: YYYY-MM-DD или YYYY-MM-DDTHH:MM:SS)
- `dateField` (string, query, optional) - Поле для фильтрации по дате (по умолчанию: "completed_at")
  - `started_at` - фильтрация по дате начала экзамена
  - `completed_at` - фильтрация по дате завершения экзамена
- `limit` (number, query, optional) - Максимальное количество записей (по умолчанию: 50, максимум: 200)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "deviceId": "iPhone-UUID-12345",
    "startedAt": "2025-10-23 12:00:00",
    "completedAt": "2025-10-23 12:45:30",
    "durationSeconds": 2730,
    "totalQuestions": 45,
    "totalPoints": 78,
    "maxPossiblePoints": 90,
    "scorePercentage": 86.67,
    "status": "completed"
  },
  {
    "id": 2,
    "deviceId": "iPhone-UUID-12345",
    "startedAt": "2025-10-22 10:00:00",
    "completedAt": "2025-10-22 10:42:15",
    "durationSeconds": 2535,
    "totalQuestions": 45,
    "totalPoints": 70,
    "maxPossiblePoints": 90,
    "scorePercentage": 77.78,
    "status": "completed"
  }
]
```

**Примеры запросов:**

```http
# Получить все экзамены за последний месяц
GET /api/exams/history/device123?startDate=2024-11-01&endDate=2024-11-30

# Получить экзамены, начатые в определенный день
GET /api/exams/history/device123?startDate=2024-11-15&dateField=started_at

# Получить последние 20 экзаменов, завершенных до определенной даты
GET /api/exams/history/device123?endDate=2024-11-15&limit=20

# Получить экзамены за конкретный день с временными метками
GET /api/exams/history/device123?startDate=2024-11-15T00:00:00&endDate=2024-11-15T23:59:59
```

**Errors:**
- `400` - deviceId отсутствует или некорректные параметры дат
- `500` - Ошибка сервера

**Пример ошибки валидации дат:**
```json
{
  "error": "Invalid date filter parameters",
  "details": [
    {
      "field": "startDate",
      "message": "Invalid startDate format \"2024-13-01\". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format"
    }
  ],
  "supportedFormats": [
    "YYYY-MM-DD (e.g., 2024-01-15)",
    "YYYY-MM-DDTHH:MM:SS (e.g., 2024-01-15T14:30:00)",
    "YYYY-MM-DD HH:MM:SS (e.g., 2024-01-15 14:30:00)"
  ],
  "supportedDateFields": ["started_at", "completed_at"],
  "examples": [
    "startDate=2024-01-01&endDate=2024-01-31",
    "startDate=2024-01-01&dateField=started_at",
    "endDate=2024-01-15&dateField=completed_at"
  ]
}
```

---

### 5. Получить детали конкретного экзамена

```http
GET /api/exams/{examId}
```

**Parameters:**
- `examId` (number, в URL) - ID экзамена

**Response (200 OK):**
```json
{
  "exam": {
    "id": 1,
    "deviceId": "iPhone-UUID-12345",
    "startedAt": "2025-10-23 12:00:00",
    "completedAt": "2025-10-23 12:45:30",
    "durationSeconds": 2730,
    "totalQuestions": 45,
    "totalPoints": 78,
    "maxPossiblePoints": 90,
    "scorePercentage": 86.67,
    "status": "completed"
  },
  "questions": [...]
}
```

**Errors:**
- `400` - Некорректный examId
- `404` - Экзамен не найден
- `500` - Ошибка сервера

---

### 6. Получить статистику пользователя

```http
GET /api/users/{deviceId}/stats
```

**Parameters:**
- `deviceId` (string, в URL) - ID устройства

**Response (200 OK):**
```json
{
  "totalExams": 10,
  "averageScore": 78.5,
  "bestScore": 95.5,
  "worstScore": 62.2,
  "totalQuestionsAnswered": 450,
  "improvementTrend": [65, 70, 75, 78.5, 80, 82, 85, 88, 90, 92],
  "byTopic": [
    {
      "topic": "Математика",
      "examsCount": 5,
      "avgScore": 82.3,
      "questionsAnswered": 225
    },
    {
      "topic": "Физика",
      "examsCount": 5,
      "avgScore": 74.7,
      "questionsAnswered": 225
    }
  ]
}
```

**Errors:**
- `400` - deviceId отсутствует
- `500` - Ошибка сервера

---

## Типичный flow для iOS приложения

```swift
// 1. Начать экзамен
let startRequest = StartExamRequest(
    deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "",
    questionCount: 45
)
let examResponse = await api.startExam(startRequest)

// 2. Получить вопросы
let questions = await api.getExamQuestions(examId: examResponse.examId)

// 3. Показать вопросы пользователю и собрать ответы
var userAnswers: [Answer] = []
for question in questions {
    let answer = showQuestionToUser(question)
    userAnswers.append(Answer(questionId: question.questionId, answer: answer))
}

// 4. Отправить все ответы
let submitRequest = SubmitExamRequest(
    deviceId: UIDevice.current.identifierForVendor?.uuidString ?? "",
    answers: userAnswers
)
let results = await api.submitExam(examId: examResponse.examId, request: submitRequest)

// 5. Показать результаты
showResults(results.exam.scorePercentage, results.questions)

// 6. Показать историю и статистику
let history = await api.getExamHistory(deviceId: deviceId)
let stats = await api.getUserStats(deviceId: deviceId)
```

---

## Swift Models (примеры)

```swift
struct StartExamRequest: Codable {
    let deviceId: String
    let questionCount: Int
    let filters: ExamFilters?
}

struct ExamFilters: Codable {
    let topic: String?
    let level: Int?
}

struct ExamResponse: Codable {
    let examId: Int
    let deviceId: String
    let totalQuestions: Int
    let questionIds: [Int]
    let startedAt: String
    let status: String
}

struct ExamQuestion: Codable {
    let order: Int
    let questionId: Int
    let question: String
    let language: String
    let topic: String
    let level: Int
    let photos: [String]
    let options: [AnswerOption]
    let context: Context?
    let maxPoints: Double
}

struct AnswerOption: Codable {
    let id: Int
    let questionId: Int
    let optionLetter: String
    let optionTextRu: String
    let optionTextKz: String
    let orderIndex: Int
    let suboptions: [Suboption]
}

struct Suboption: Codable {
    let id: Int
    let text: String
    let correct: Bool
    let orderIndex: Int
}

struct Context: Codable {
    let id: Int
    let text: String
    let title: String
    let photos: [String]
}

struct SubmitExamRequest: Codable {
    let deviceId: String
    let answers: [Answer]
}

struct Answer: Codable {
    let questionId: Int
    let answer: String
}

struct ExamResults: Codable {
    let exam: ExamSummary
    let questions: [QuestionResult]
}

struct ExamSummary: Codable {
    let id: Int
    let deviceId: String
    let startedAt: String
    let completedAt: String
    let durationSeconds: Int
    let totalQuestions: Int
    let totalPoints: Double
    let maxPossiblePoints: Double
    let scorePercentage: Double
    let status: String
}

struct QuestionResult: Codable {
    let questionId: Int
    let questionOrder: Int
    let userAnswer: String
    let correctAnswer: String
    let pointsEarned: Double
    let maxPoints: Double
    let question: String
    let language: String
    let topic: String
    let level: Int
}

struct UserStats: Codable {
    let totalExams: Int
    let averageScore: Double
    let bestScore: Double
    let worstScore: Double
    let totalQuestionsAnswered: Int
    let improvementTrend: [Double]
    let byTopic: [TopicStats]
}

struct TopicStats: Codable {
    let topic: String
    let examsCount: Int
    let avgScore: Double
    let questionsAnswered: Int
}
```

---

## Важные заметки

1. **deviceId** - используйте `UIDevice.current.identifierForVendor?.uuidString` для уникальной идентификации устройства

2. **Формат ответов** - ответы всегда в виде строки: "A" для одного варианта, "A,C,F" для нескольких (через запятую без пробелов)

3. **Все данные в camelCase** - не нужно конвертировать ключи, всё готово для Swift

4. **Изображения** - пути к изображениям берутся из поля `photos`, полный URL: `https://yourapi.com/api/files/{filename}`

5. **Язык вопросов** - проверяйте поле `language` ("ru" или "kz") чтобы показывать правильный текст

6. **Экзамен одноразовый** - после submit нельзя отправить ответы повторно (статус меняется на "completed")

7. **Время экзамена** - `durationSeconds` вычисляется автоматически между `startedAt` и `completedAt`
