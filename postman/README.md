# 📮 Postman Collection для Math App API

Автоматически сгенерированная коллекция для тестирования всех API endpoints с умными тестами и переменными.

## 🚀 Быстрый старт

### 1. Генерация коллекции
```bash
npm run postman:generate
```

### 2. Импорт в Postman
1. Откройте Postman
2. Нажмите **Import** 
3. Выберите файл: `postman/collections/math-app-api.postman_collection.json`
4. Импортируйте environments:
   - `postman/environments/local.postman_environment.json`
   - `postman/environments/production.postman_environment.json`
   - `postman/environments/staging.postman_environment.json`

### 3. Выбор окружения
В правом верхнем углу Postman выберите нужное окружение:
- **Local Development** - для localhost:3000
- **Production (Railway)** - для production сервера
- **Staging Server** - для тестового сервера

## 📁 Структура коллекции

### 📝 Questions
- **Get All Questions** - получить все вопросы
- **Create Question (Simple)** - создать простой вопрос
- **Create Question (With Suboptions)** - создать сложный вопрос с подопциями
- **Get Question by ID** - получить вопрос по ID
- **Update Question** - обновить вопрос
- **Delete Question** - удалить вопрос

### 📚 Contexts
- **Get All Contexts** - получить все контексты
- **Create Context** - создать контекст
- **Get Context by ID** - получить контекст по ID
- **Update Context** - обновить контекст
- **Delete Context** - удалить контекст

### 📁 Files
- **List All Files** - список всех файлов

### 🎯 Exams
- **Start Exam** - начать экзамен
- **Get Exam Questions** - получить вопросы экзамена
- **Submit Exam** - отправить ответы
- **Get Exam History** - история экзаменов

### ⚙️ System
- **Health Check** - проверка работоспособности
- **API Documentation** - документация API
- **Get User Stats** - статистика пользователя

## 🔧 Переменные окружения

### Автоматические переменные:
- `base_url` - базовый URL API
- `admin_token` - токен администратора
- `device_id` - уникальный ID устройства

### Переменные для тестов:
- `test_question_id` - ID созданного тестового вопроса
- `complex_question_id` - ID сложного вопроса
- `test_context_id` - ID тестового контекста
- `exam_id` - ID текущего экзамена
- `first_question_id` - ID первого вопроса в экзамене

## 🧪 Автоматические тесты

Каждый запрос включает автоматические тесты:

### Глобальные тесты:
- ✅ Статус код успешный (200, 201, 204)
- ✅ Время ответа меньше 5 секунд
- ✅ Правильный Content-Type

### Специализированные тесты:
- ✅ Валидация структуры ответа
- ✅ Проверка обязательных полей
- ✅ Автоматическое сохранение ID в переменные
- ✅ Проверка бизнес-логики

## 🔄 Workflow для тестирования

### Типичный порядок запросов:
1. **Health Check** - проверка API
2. **Create Context** - создание контекста (если нужен)
3. **Create Question** - создание вопроса
4. **Get Question by ID** - проверка созданного вопроса
5. **Update Question** - обновление вопроса
6. **Start Exam** - начало экзамена
7. **Get Exam Questions** - получение вопросов
8. **Submit Exam** - отправка ответов
9. **Delete Question** - очистка (опционально)

## 🌍 Переключение между окружениями

### Local Development (localhost:3000):
```bash
base_url: http://localhost:3000
admin_token: admin123
device_id: postman-test-device-local
```

### Production (Railway):
```bash
base_url: https://math-app-production.up.railway.app
admin_token: your-production-admin-token
device_id: postman-test-device-prod
```

### Staging:
```bash
base_url: http://localhost:3001
admin_token: staging-admin-token
device_id: postman-test-device-staging
```

## 🤖 Автоматизация с Newman

### Запуск тестов из командной строки:

```bash
# Тестирование локального сервера
npm run postman:test

# Тестирование production сервера
npm run postman:test-prod

# Кастомные тесты с Newman
npx newman run postman/collections/math-app-api.postman_collection.json \
  -e postman/environments/local.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export postman-report.html
```

## 📦 Установка Newman (опционально)

```bash
npm install -g newman
npm install -g newman-reporter-html
```

## 🔄 Автоматическое обновление

Коллекция автоматически генерируется из кода API. После изменения роутов:

```bash
npm run postman:generate
```

## 💡 Советы по использованию

### 1. Цепочка запросов:
Запросы связаны через переменные. Выполняйте их последовательно для корректной работы.

### 2. Очистка данных:
После тестирования удаляйте созданные тестовые данные с помощью DELETE запросов.

### 3. Мониторинг:
Используйте Newman в CI/CD для автоматического тестирования API после деплоя.

### 4. Безопасность:
Не коммитьте production токены в git. Используйте переменные окружения.

## 🆘 Troubleshooting

### Проблема: Переменные не сохраняются
**Решение**: Убедитесь, что выбрано правильное окружение в Postman

### Проблема: Тесты падают
**Решение**: Проверьте, что сервер запущен и доступен по указанному URL

### Проблема: 404 ошибки
**Решение**: Убедитесь, что base_url правильный и не содержит лишних слешей

---

**Автоматически сгенерировано скриптом `postman/scripts/generate-postman.js`**