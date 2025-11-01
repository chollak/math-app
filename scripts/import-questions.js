const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// БЕЗОПАСНЫЙ ИМПОРТ ВОПРОСОВ
// Этот скрипт создает резервную копию базы перед импортом

const BACKUP_DIR = path.join(__dirname, '../backups');
const QUESTIONS_FILE = path.join(__dirname, '../temp/questions.txt');

class SafeQuestionImporter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.importStats = {
      processed: 0,
      imported: 0,
      errors: 0,
      duplicates: 0
    };
  }

  // 1. СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `database-backup-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Создаем папку для бэкапов если не существует
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Копируем базу данных
    fs.copyFileSync(this.dbPath, backupPath);
    console.log(`✅ Резервная копия создана: ${backupPath}`);
    return backupPath;
  }

  // 2. ПРОВЕРКА СТРУКТУРЫ БАЗЫ
  async validateDatabase() {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'", (err, row) => {
        if (err) reject(err);
        if (!row) reject(new Error('Таблица questions не найдена'));
        resolve(true);
      });
    });
  }

  // 3. ЗАГРУЗКА И ВАЛИДАЦИЯ JSON
  loadQuestions() {
    try {
      const content = fs.readFileSync(QUESTIONS_FILE, 'utf8');
      const questions = JSON.parse(content);
      
      if (!Array.isArray(questions)) {
        throw new Error('Файл должен содержать массив вопросов');
      }

      console.log(`📄 Загружено ${questions.length} вопросов из файла`);
      return questions;
    } catch (error) {
      throw new Error(`Ошибка чтения файла: ${error.message}`);
    }
  }

  // 4. ГРУППИРОВКА ВОПРОСОВ ПО ПАРАМ RU/KZ
  groupQuestionPairs(questions) {
    const pairs = [];
    const ruQuestions = questions.filter(q => q.language === 'ru');
    
    for (const ruQuestion of ruQuestions) {
      // Ищем соответствующий казахский вопрос
      const kzQuestion = questions.find(q => 
        q.language === 'kz' && 
        q.topic === ruQuestion.topic && 
        this.questionsAreSimilar(ruQuestion, q)
      );

      pairs.push({
        ru: ruQuestion,
        kz: kzQuestion || null,
        topic: ruQuestion.topic
      });
    }

    console.log(`🔗 Сформировано ${pairs.length} пар вопросов`);
    return pairs;
  }

  // Простая проверка схожести вопросов
  questionsAreSimilar(q1, q2) {
    if (!q2) return false;
    return q1.options.length === q2.options.length;
  }

  // 5. ПРОВЕРКА НА ДУБЛИКАТЫ
  async checkForDuplicates(questionPair) {
    return new Promise((resolve) => {
      const ruText = questionPair.ru.question;
      const sql = `SELECT id FROM questions WHERE question_ru = ? OR question_kz = ?`;
      
      this.db.get(sql, [ruText, ruText], (err, row) => {
        resolve(!!row); // true если дубликат найден
      });
    });
  }

  // 6. ГЕНЕРАЦИЯ ОТВЕТА (берем первую правильную опцию)
  generateAnswer(questionData) {
    for (let i = 0; i < questionData.options.length; i++) {
      const option = questionData.options[i];
      if (option.suboptions) {
        const correctSub = option.suboptions.find(sub => sub.correct);
        if (correctSub) {
          return String.fromCharCode(65 + i); // A, B, C, D...
        }
      }
    }
    return 'A'; // По умолчанию
  }

  // 7. ИМПОРТ ОДНОГО ВОПРОСА
  async importQuestion(questionPair) {
    return new Promise((resolve, reject) => {
      const { ru, kz, topic } = questionPair;
      
      // Данные для вставки
      const questionData = {
        question_ru: ru.question,
        question_kz: kz ? kz.question : null,
        language: 'ru', // По умолчанию русский
        answer: this.generateAnswer(ru),
        level: 1, // По умолчанию уровень 1
        topic: topic,
        photos: '[]',
        context_id: null
      };

      // Вставляем вопрос
      const sql = `
        INSERT INTO questions (
          question_ru, question_kz, language, answer, level, topic, photos, context_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        questionData.question_ru,
        questionData.question_kz,
        questionData.language,
        questionData.answer,
        questionData.level,
        questionData.topic,
        questionData.photos,
        questionData.context_id
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }

        const questionId = this.lastID;
        resolve({ questionId, questionData, options: ru.options });
      });
    });
  }

  // 8. ИМПОРТ ОПЦИЙ
  async importOptions(questionId, options, language) {
    const AnswerOption = require('../src/models/AnswerOption');
    
    return new Promise((resolve, reject) => {
      AnswerOption.createBatch(questionId, options, language, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  // 9. ОСНОВНОЙ ПРОЦЕСС ИМПОРТА
  async import() {
    try {
      console.log('🚀 Начало безопасного импорта вопросов...\n');

      // Шаг 1: Создаем резервную копию
      const backupPath = await this.createBackup();

      // Шаг 2: Подключаемся к базе
      this.db = new sqlite3.Database(this.dbPath);
      await this.validateDatabase();
      console.log('✅ Подключение к базе данных успешно\n');

      // Шаг 3: Загружаем вопросы
      const questions = this.loadQuestions();

      // Шаг 4: Группируем в пары
      const questionPairs = this.groupQuestionPairs(questions);

      // Шаг 5: Импортируем каждую пару
      console.log('📥 Начинаем импорт...\n');
      
      for (const pair of questionPairs) {
        try {
          this.importStats.processed++;

          // Проверяем на дубликаты
          const isDuplicate = await this.checkForDuplicates(pair);
          if (isDuplicate) {
            console.log(`⚠️  Пропускаем дубликат: ${pair.ru.question.substring(0, 50)}...`);
            this.importStats.duplicates++;
            continue;
          }

          // Импортируем вопрос
          const result = await this.importQuestion(pair);
          
          // Импортируем опции
          await this.importOptions(result.questionId, result.options, 'ru');
          
          this.importStats.imported++;
          console.log(`✅ Импортирован вопрос ${this.importStats.imported}/${questionPairs.length}`);

        } catch (error) {
          console.error(`❌ Ошибка импорта вопроса: ${error.message}`);
          this.importStats.errors++;
        }
      }

      // Шаг 6: Выводим статистику
      this.printStats();
      
    } catch (error) {
      console.error('💥 Критическая ошибка:', error.message);
      console.log(`🔄 Для восстановления используйте резервную копию`);
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }

  printStats() {
    console.log('\n📊 СТАТИСТИКА ИМПОРТА:');
    console.log(`   Обработано: ${this.importStats.processed}`);
    console.log(`   Импортировано: ${this.importStats.imported}`);
    console.log(`   Дубликатов пропущено: ${this.importStats.duplicates}`);
    console.log(`   Ошибок: ${this.importStats.errors}`);
    console.log('\n✅ Импорт завершен!');
  }

  // 10. ФУНКЦИЯ ВОССТАНОВЛЕНИЯ ИЗ БЭКАПА
  static restoreFromBackup(backupPath, targetPath) {
    try {
      fs.copyFileSync(backupPath, targetPath);
      console.log(`✅ База данных восстановлена из ${backupPath}`);
    } catch (error) {
      console.error('❌ Ошибка восстановления:', error.message);
    }
  }
}

// ЗАПУСК ИМПОРТА
async function main() {
  // Получаем путь к базе данных из конфигурации
  const storageConfig = require('../src/config/storage');
  const dbPath = storageConfig.databasePath;
  
  console.log(`📍 База данных: ${dbPath}`);
  
  // Проверяем существование файла вопросов
  if (!fs.existsSync(QUESTIONS_FILE)) {
    console.error(`❌ Файл ${QUESTIONS_FILE} не найден`);
    process.exit(1);
  }

  // Проверяем существование базы данных
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ База данных ${dbPath} не найдена`);
    process.exit(1);
  }

  const importer = new SafeQuestionImporter(dbPath);
  await importer.import();
}

// Запускаем только если вызван напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SafeQuestionImporter;