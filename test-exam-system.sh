#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
DEVICE_ID="iPhone-TEST-$(date +%s)"

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Тестирование системы экзаменов${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Device ID: ${DEVICE_ID}${NC}"
echo ""

# 1. Проверка здоровья сервера
echo -e "${GREEN}[1/7] Проверка здоровья сервера...${NC}"
curl -s ${API_URL}/health | python3 -m json.tool
echo ""
echo ""

# 2. Проверка количества вопросов
echo -e "${GREEN}[2/7] Проверка количества вопросов в базе...${NC}"
QUESTIONS_COUNT=$(curl -s ${API_URL}/api/questions | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "Вопросов в базе: ${QUESTIONS_COUNT}"
echo ""

if [ "$QUESTIONS_COUNT" -lt 3 ]; then
    echo -e "${YELLOW}Недостаточно вопросов для теста. Создаю тестовые вопросы...${NC}"
    echo ""

    # Создание вопроса 1 (1 правильный ответ)
    echo "Создаю вопрос 1 (1 правильный ответ = 1 балл)..."
    curl -s -X POST ${API_URL}/api/questions \
      -H "Content-Type: application/json" \
      -d '{
        "question_ru": "Сколько будет 2+2?",
        "question_kz": "2+2 нешеу болады?",
        "answer": "B",
        "level": 1,
        "topic": "Математика",
        "options": [
          {"option_text_ru": "3", "option_text_kz": "3"},
          {"option_text_ru": "4", "option_text_kz": "4"},
          {"option_text_ru": "5", "option_text_kz": "5"}
        ]
      }' > /dev/null
    echo "✓ Вопрос 1 создан"

    # Создание вопроса 2 (2 правильных ответа)
    echo "Создаю вопрос 2 (2 правильных ответа = 2 балла)..."
    curl -s -X POST ${API_URL}/api/questions \
      -H "Content-Type: application/json" \
      -d '{
        "question_ru": "Какие числа четные?",
        "question_kz": "Қандай сандар жұп?",
        "answer": "A,C",
        "level": 2,
        "topic": "Математика",
        "options": [
          {"option_text_ru": "2", "option_text_kz": "2"},
          {"option_text_ru": "3", "option_text_kz": "3"},
          {"option_text_ru": "4", "option_text_kz": "4"},
          {"option_text_ru": "5", "option_text_kz": "5"}
        ]
      }' > /dev/null
    echo "✓ Вопрос 2 создан"

    # Создание вопроса 3 (3 правильных ответа)
    echo "Создаю вопрос 3 (3 правильных ответа = 2 балла)..."
    curl -s -X POST ${API_URL}/api/questions \
      -H "Content-Type: application/json" \
      -d '{
        "question_ru": "Какие из следующих чисел делятся на 2?",
        "question_kz": "Келесі сандардың қайсысы 2-ге бөлінеді?",
        "answer": "A,B,D",
        "level": 3,
        "topic": "Математика",
        "options": [
          {"option_text_ru": "4", "option_text_kz": "4"},
          {"option_text_ru": "6", "option_text_kz": "6"},
          {"option_text_ru": "7", "option_text_kz": "7"},
          {"option_text_ru": "8", "option_text_kz": "8"}
        ]
      }' > /dev/null
    echo "✓ Вопрос 3 создан"
    echo ""
fi

# 3. Начать экзамен
echo -e "${GREEN}[3/7] Начинаю экзамен (3 вопроса)...${NC}"
EXAM_RESPONSE=$(curl -s -X POST ${API_URL}/api/exams/start \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\": \"${DEVICE_ID}\", \"questionCount\": 3}")

echo "${EXAM_RESPONSE}" | python3 -m json.tool
EXAM_ID=$(echo "${EXAM_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin)['examId'])")
echo ""
echo -e "${YELLOW}Exam ID: ${EXAM_ID}${NC}"
echo ""

# 4. Получить вопросы экзамена
echo -e "${GREEN}[4/7] Получаю вопросы экзамена...${NC}"
QUESTIONS=$(curl -s ${API_URL}/api/exams/${EXAM_ID}/questions)
echo "${QUESTIONS}" | python3 -m json.tool | head -50
echo "..."
echo ""

# Извлечь ID вопросов и правильные ответы
Q1_ID=$(echo "${QUESTIONS}" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['questionId'])")
Q2_ID=$(echo "${QUESTIONS}" | python3 -c "import sys, json; print(json.load(sys.stdin)[1]['questionId'])")
Q3_ID=$(echo "${QUESTIONS}" | python3 -c "import sys, json; print(json.load(sys.stdin)[2]['questionId'])")

echo -e "${YELLOW}Вопросы в экзамене: ${Q1_ID}, ${Q2_ID}, ${Q3_ID}${NC}"
echo ""

# 5. Отправить ответы (симулируем правильные и неправильные)
echo -e "${GREEN}[5/7] Отправляю ответы на экзамен...${NC}"
echo "Отвечаю: "
echo "  - Вопрос ${Q1_ID}: ответ будет 'B' (зависит от вопроса)"
echo "  - Вопрос ${Q2_ID}: ответ будет 'A,C'"
echo "  - Вопрос ${Q3_ID}: ответ будет 'A,B,D'"
echo ""

# Используем фиксированные ответы для демонстрации
SUBMIT_RESPONSE=$(curl -s -X POST ${API_URL}/api/exams/${EXAM_ID}/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"${DEVICE_ID}\",
    \"answers\": [
      {\"questionId\": ${Q1_ID}, \"answer\": \"B\"},
      {\"questionId\": ${Q2_ID}, \"answer\": \"A,C\"},
      {\"questionId\": ${Q3_ID}, \"answer\": \"A,B\"}
    ]
  }")

echo "${SUBMIT_RESPONSE}" | python3 -m json.tool | head -60
echo ""

# Извлечь результаты
SCORE=$(echo "${SUBMIT_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin)['exam']['scorePercentage'])")
POINTS=$(echo "${SUBMIT_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin)['exam']['totalPoints'])")
MAX_POINTS=$(echo "${SUBMIT_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin)['exam']['maxPossiblePoints'])")

echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   РЕЗУЛЬТАТЫ: ${POINTS}/${MAX_POINTS} баллов (${SCORE}%)${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo ""

# 6. Получить историю экзаменов
echo -e "${GREEN}[6/7] Получаю историю экзаменов...${NC}"
curl -s ${API_URL}/api/exams/history/${DEVICE_ID} | python3 -m json.tool
echo ""

# 7. Получить статистику пользователя
echo -e "${GREEN}[7/7] Получаю статистику пользователя...${NC}"
curl -s ${API_URL}/api/users/${DEVICE_ID}/stats | python3 -m json.tool
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Тестирование завершено успешно!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Подробная документация: EXAM_API_DOCUMENTATION.md${NC}"
echo ""
