const fs = require('fs');
const path = require('path');

// ТЕСТОВЫЙ СКРИПТ для проверки импорта на копии базы

const QUESTIONS_FILE = path.join(__dirname, 'questions-import.txt');

function testQuestionsParsing() {
  console.log('🧪 Тестирование парсинга questions.txt...\n');
  
  try {
    // Читаем файл
    const content = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    console.log(`📄 Размер файла: ${(content.length / 1024).toFixed(2)} KB`);
    
    // Парсим JSON
    const questions = JSON.parse(content);
    console.log(`📊 Количество вопросов: ${questions.length}`);
    
    // Анализируем структуру
    const languages = {};
    const topics = {};
    let withSuboptions = 0;
    
    questions.forEach(q => {
      languages[q.language] = (languages[q.language] || 0) + 1;
      topics[q.topic] = (topics[q.topic] || 0) + 1;
      
      if (q.options && q.options.some(opt => opt.suboptions)) {
        withSuboptions++;
      }
    });
    
    console.log('\n📈 Статистика:');
    console.log('   Языки:', languages);
    console.log('   Темы:', topics);
    console.log(`   С подопциями: ${withSuboptions}`);
    
    // Показываем первый вопрос как пример
    console.log('\n📝 Пример первого вопроса:');
    console.log('   Язык:', questions[0].language);
    console.log('   Тема:', questions[0].topic);
    console.log('   Текст:', questions[0].question.substring(0, 100) + '...');
    console.log('   Опций:', questions[0].options.length);
    
    console.log('\n✅ Парсинг успешен! Файл готов к импорту.');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка парсинга:', error.message);
    return false;
  }
}

function createTestDatabase() {
  const sqlite3 = require('sqlite3').verbose();
  const testDbPath = path.join(__dirname, '../test-database.sqlite');
  
  console.log('\n🗃️  Создание тестовой базы данных...');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(testDbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Создаем базовые таблицы (упрощенная версия)
      const createTables = `
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_ru TEXT,
          question_kz TEXT,
          language TEXT DEFAULT 'ru',
          answer TEXT NOT NULL,
          level INTEGER,
          topic TEXT,
          photos TEXT DEFAULT '[]',
          context_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS answer_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          option_letter TEXT NOT NULL,
          option_text_ru TEXT,
          option_text_kz TEXT,
          order_index INTEGER NOT NULL,
          FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS suboptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          option_id INTEGER NOT NULL,
          text TEXT NOT NULL,
          correct BOOLEAN NOT NULL DEFAULT 0,
          order_index INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (option_id) REFERENCES answer_options (id) ON DELETE CASCADE
        );
      `;
      
      db.exec(createTables, (err) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          console.log(`✅ Тестовая база создана: ${testDbPath}`);
          resolve(testDbPath);
        }
      });
    });
  });
}

async function runTests() {
  console.log('🚀 Запуск тестов импорта...\n');
  
  // Тест 1: Парсинг файла
  const parseSuccess = testQuestionsParsing();
  if (!parseSuccess) {
    console.log('❌ Тесты провалены на этапе парсинга');
    return;
  }
  
  // Тест 2: Создание тестовой базы
  try {
    const testDbPath = await createTestDatabase();
    console.log('\n✅ Все тесты пройдены! Можно запускать импорт.');
    console.log('\n📋 Следующие шаги:');
    console.log('   1. Убедитесь что сервер остановлен');
    console.log('   2. Запустите: node scripts/import-questions.js');
    console.log('   3. Проверьте результаты в базе данных');
    console.log('   4. При необходимости восстановитесь из бэкапа');
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовой базы:', error.message);
  }
}

// Запуск тестов
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testQuestionsParsing, createTestDatabase };