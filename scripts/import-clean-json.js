const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// ИМПОРТ ВОПРОСОВ ИЗ scripts/output_clean.json
// Специальный скрипт для импорта JSON формата с парами ru/kz вопросов

const BACKUP_DIR = path.join(__dirname, '../backups');
const JSON_FILE = path.join(__dirname, 'output_clean.json');

class CleanJsonImporter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.importStats = {
      totalQuestions: 0,
      questionPairs: 0,
      imported: 0,
      errors: 0,
      duplicates: 0
    };
  }

  // 1. СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `database-backup-clean-json-${timestamp}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

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

  // 3. ЗАГРУЗКА JSON
  loadQuestions() {
    try {
      const content = fs.readFileSync(JSON_FILE, 'utf8');
      const questions = JSON.parse(content);
      
      if (!Array.isArray(questions)) {
        throw new Error('Файл должен содержать массив вопросов');
      }

      this.importStats.totalQuestions = questions.length;
      console.log(`📄 Загружено ${questions.length} вопросов из JSON файла`);
      return questions;
    } catch (error) {
      throw new Error(`Ошибка чтения JSON файла: ${error.message}`);
    }
  }

  // 4. ГРУППИРОВКА ВОПРОСОВ ПО ПАРАМ RU/KZ
  groupQuestionPairs(questions) {
    const pairs = [];
    const processed = new Set();

    for (const question of questions) {
      if (processed.has(question)) continue;
      
      if (question.language === 'ru') {
        // Ищем соответствующий казахский вопрос
        const kzQuestion = questions.find(q => 
          q.language === 'kz' && 
          q.topic === question.topic && 
          q.answer === question.answer &&
          q.level === question.level &&
          this.arraysEqual(q.options, question.options) // Одинаковые опции
        );

        pairs.push({
          ru: question,
          kz: kzQuestion || null,
          topic: question.topic,
          answer: question.answer,
          level: question.level,
          options: question.options
        });

        processed.add(question);
        if (kzQuestion) processed.add(kzQuestion);
      }
    }

    // Обрабатываем оставшиеся казахские вопросы без пары
    for (const question of questions) {
      if (!processed.has(question) && question.language === 'kz') {
        pairs.push({
          ru: null,
          kz: question,
          topic: question.topic,
          answer: question.answer,
          level: question.level,
          options: question.options
        });
        processed.add(question);
      }
    }

    this.importStats.questionPairs = pairs.length;
    console.log(`🔗 Сформировано ${pairs.length} пар вопросов`);
    return pairs;
  }

  // Сравнение массивов опций
  arraysEqual(arr1, arr2) {
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
  }

  // 5. ПРОВЕРКА НА ДУБЛИКАТЫ
  async checkForDuplicates(questionPair) {
    return new Promise((resolve) => {
      const ruText = questionPair.ru ? questionPair.ru.question : null;
      const kzText = questionPair.kz ? questionPair.kz.question : null;
      
      if (!ruText && !kzText) {
        resolve(false);
        return;
      }

      const sql = `
        SELECT id FROM questions 
        WHERE (question_ru = ? OR question_kz = ?) OR 
              (question_ru = ? OR question_kz = ?)
      `;
      
      this.db.get(sql, [ruText, ruText, kzText, kzText], (err, row) => {
        if (err) {
          console.error('Ошибка проверки дубликатов:', err);
          resolve(false);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  // 6. ИМПОРТ ОДНОЙ ПАРЫ ВОПРОСОВ
  async importQuestionPair(questionPair) {
    return new Promise((resolve, reject) => {
      const { ru, kz, topic, answer, level, options } = questionPair;
      
      // Данные для вставки
      const questionData = {
        question_ru: ru ? ru.question : null,
        question_kz: kz ? kz.question : null,
        language: ru ? 'ru' : 'kz', // Приоритет русскому
        answer: answer,
        level: level || 1,
        topic: topic,
        context_id: null,
        photos: '[]'
      };

      // SQL для вставки вопроса
      const sql = `
        INSERT INTO questions (
          question_ru, question_kz, language, answer, level, topic, context_id, photos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        questionData.question_ru,
        questionData.question_kz,
        questionData.language,
        questionData.answer,
        questionData.level,
        questionData.topic,
        questionData.context_id,
        questionData.photos
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }

        const questionId = this.lastID;
        resolve({ questionId, options });
      });
    });
  }

  // 7. ИМПОРТ ОПЦИЙ ДЛЯ ВОПРОСА
  async importOptions(questionId, options) {
    return new Promise((resolve, reject) => {
      if (!options || !Array.isArray(options)) {
        resolve();
        return;
      }

      let completed = 0;
      let hasError = false;

      options.forEach((optionText, index) => {
        const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
        
        const sql = `
          INSERT INTO answer_options (
            question_id, option_letter, option_text_ru, option_text_kz, order_index
          ) VALUES (?, ?, ?, ?, ?)
        `;

        this.db.run(sql, [
          questionId,
          optionLetter,
          optionText, // Используем тот же текст для обоих языков
          optionText,
          index
        ], (err) => {
          if (err) {
            if (!hasError) {
              hasError = true;
              reject(err);
            }
            return;
          }

          completed++;
          if (completed === options.length) {
            resolve();
          }
        });
      });

      if (options.length === 0) {
        resolve();
      }
    });
  }

  // 8. ОСНОВНОЙ ПРОЦЕСС ИМПОРТА
  async import() {
    try {
      console.log('🚀 Начало импорта из temp/output_clean.json...\n');

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
      console.log('📥 Начинаем импорт пар вопросов...\n');
      
      for (let i = 0; i < questionPairs.length; i++) {
        const pair = questionPairs[i];
        
        try {
          // Проверяем на дубликаты
          const isDuplicate = await this.checkForDuplicates(pair);
          if (isDuplicate) {
            const questionText = pair.ru ? pair.ru.question : pair.kz.question;
            console.log(`⚠️  Пропускаем дубликат: ${questionText.substring(0, 50)}...`);
            this.importStats.duplicates++;
            continue;
          }

          // Импортируем пару вопросов
          const result = await this.importQuestionPair(pair);
          
          // Импортируем опции
          await this.importOptions(result.questionId, result.options);
          
          this.importStats.imported++;
          
          if (this.importStats.imported % 50 === 0) {
            console.log(`✅ Импортировано ${this.importStats.imported}/${questionPairs.length} пар`);
          }

        } catch (error) {
          console.error(`❌ Ошибка импорта пары ${i + 1}: ${error.message}`);
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
    console.log(`   Всего вопросов в JSON: ${this.importStats.totalQuestions}`);
    console.log(`   Пар вопросов сформировано: ${this.importStats.questionPairs}`);
    console.log(`   Успешно импортировано: ${this.importStats.imported}`);
    console.log(`   Дубликатов пропущено: ${this.importStats.duplicates}`);
    console.log(`   Ошибок: ${this.importStats.errors}`);
    console.log('\n✅ Импорт завершен!');
  }
}

// ЗАПУСК ИМПОРТА
async function main() {
  // Получаем путь к базе данных из конфигурации
  const storageConfig = require('../src/config/storage');
  const dbPath = storageConfig.databasePath;
  
  console.log(`📍 База данных: ${dbPath}`);
  
  // Проверяем существование JSON файла
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ Файл ${JSON_FILE} не найден`);
    console.error(`📍 Ожидаемый путь: scripts/output_clean.json`);
    process.exit(1);
  }

  // Проверяем существование базы данных
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ База данных ${dbPath} не найдена`);
    process.exit(1);
  }

  const importer = new CleanJsonImporter(dbPath);
  await importer.import();
}

// Запускаем только если вызван напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CleanJsonImporter;