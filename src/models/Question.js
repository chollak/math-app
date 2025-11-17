const database = require('../config/database');

class Question {
  static create(questionData, callback) {
    const {
      question_ru,
      question_kz,
      language,
      answer,
      level,
      topic,
      photos,
      context_id
    } = questionData;

    const sql = `
      INSERT INTO questions (
        question_ru, question_kz, language, answer, level, topic, photos, context_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const photosJson = JSON.stringify(photos || []);

    database.db.run(sql, [
      question_ru, question_kz, language || 'ru', answer, level, topic, photosJson, context_id
    ], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { 
          id: this.lastID, 
          question_ru,
          question_kz,
          language: language || 'ru',
          answer,
          level,
          topic,
          photos: photos || [],
          context_id
        });
      }
    });
  }

  static findAll(language = null, callback, options = {}) {
    // Handle case where language is actually the callback (backward compatibility)
    if (typeof language === 'function') {
      callback = language;
      language = null;
      options = {};
    }
    
    // Handle case where callback is actually options
    if (typeof callback === 'object') {
      options = callback;
      callback = arguments[2] || (() => {});
    }

    let sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos,
             GROUP_CONCAT(
               CASE 
                 WHEN q.language = 'kz' THEN ao.option_text_kz 
                 ELSE ao.option_text_ru 
               END
               ORDER BY ao.order_index
             ) as options_data
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      LEFT JOIN answer_options ao ON q.id = ao.question_id
    `;

    const params = [];
    
    // Add language filter if specified - filter by text availability
    if (language && (language === 'ru' || language === 'kz')) {
      if (language === 'kz') {
        // Show questions that have Kazakh text
        sql += ` WHERE q.question_kz IS NOT NULL AND q.question_kz != ''`;
      } else {
        // Show questions that have Russian text  
        sql += ` WHERE q.question_ru IS NOT NULL AND q.question_ru != ''`;
      }
    }
    
    sql += `
      GROUP BY q.id
    `;
    
    // Добавляем сортировку в зависимости от опций
    if (options.randomOrder === true) {
      // Для SQLite используем RANDOM() для случайной сортировки
      sql += ` ORDER BY RANDOM()`;
    } else {
      // По умолчанию сортируем по дате создания (для обратной совместимости)
      sql += ` ORDER BY q.created_at DESC`;
    }

    database.db.all(sql, params, (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Get detailed options with suboptions for all questions
        const questionIds = rows.map(row => row.id);
        
        if (questionIds.length === 0) {
          return callback(null, []);
        }
        
        // Get all answer options for these questions
        const optionsSql = `
          SELECT ao.*, s.id as sub_id, s.text as sub_text, s.correct as sub_correct, s.order_index as sub_order
          FROM answer_options ao
          LEFT JOIN suboptions s ON ao.id = s.option_id
          WHERE ao.question_id IN (${questionIds.map(() => '?').join(',')})
          ORDER BY ao.question_id, ao.order_index, s.order_index
        `;
        
        database.db.all(optionsSql, questionIds, (optErr, optionRows) => {
          if (optErr) {
            callback(optErr, null);
            return;
          }
          
          // Group options by question and build structure
          const questionOptions = {};
          optionRows.forEach(opt => {
            if (!questionOptions[opt.question_id]) {
              questionOptions[opt.question_id] = {};
            }
            
            if (!questionOptions[opt.question_id][opt.id]) {
              questionOptions[opt.question_id][opt.id] = {
                id: opt.id,
                option_letter: opt.option_letter,
                option_text_ru: opt.option_text_ru,
                option_text_kz: opt.option_text_kz,
                order_index: opt.order_index,
                suboptions: []
              };
            }
            
            // Add suboption if it exists
            if (opt.sub_id) {
              questionOptions[opt.question_id][opt.id].suboptions.push({
                id: opt.sub_id,
                text: opt.sub_text,
                correct: opt.sub_correct === 1,
                order_index: opt.sub_order
              });
            }
          });
          
          // Transform data to new format
          const questions = rows.map(row => {
            // Определяем язык для отображения  
            const questionLanguage = language || row.language || 'ru';
            // Выбираем текст вопроса в зависимости от языка
            const questionText = questionLanguage === 'kz' ? 
              (row.question_kz || row.question_ru) : // Fallback to Russian if Kazakh is missing
              (row.question_ru || row.question_kz);   // Fallback to Kazakh if Russian is missing
            
            // Parse photos
            const photos = JSON.parse(row.photos || '[]');
            
            // Get options for this question
            const questionOpts = questionOptions[row.id] || {};
            const options = Object.values(questionOpts).map(opt => {
              const optionText = questionLanguage === 'kz' ? opt.option_text_kz : opt.option_text_ru;
              
              if (opt.suboptions && opt.suboptions.length > 0) {
                // Return option with suboptions
                return {
                  text: optionText,
                  suboptions: opt.suboptions
                };
              } else {
                // Return simple option text
                return optionText;
              }
            });
            
            // Build context object
            const context = row.context_id ? {
              id: row.context_id,
              text: row.context_text,
              title: row.context_title,
              photos: JSON.parse(row.context_photos || '[]')
            } : null;
            
            return {
              id: row.id,
              question: questionText,
              answer: row.answer,
              level: row.level,
              topic: row.topic,
              language: questionLanguage,
              created_at: row.created_at,
              updated_at: row.updated_at,
              context_id: row.context_id,
              context_text: row.context_text,
              context_title: row.context_title,
              context_photos: row.context_photos ? JSON.parse(row.context_photos) : null,
              photos: photos,
              options: options
            };
          });
          
          callback(null, questions);
        });
      }
    });
  }

  static findById(id, language = null, callback) {
    // Handle case where language is actually the callback (backward compatibility)
    if (typeof language === 'function') {
      callback = language;
      language = null;
    }

    const sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      WHERE q.id = ?
    `;
    
    database.db.get(sql, [id], (err, row) => {
      if (err) {
        callback(err, null);
      } else if (!row) {
        callback(null, null);
      } else {
        // Use provided language or fallback to question's default language
        const questionLanguage = language || row.language || 'ru';
        
        // Choose question text based on language with fallback
        const questionText = questionLanguage === 'kz' ? 
          (row.question_kz || row.question_ru) : // Fallback to Russian if Kazakh is missing
          (row.question_ru || row.question_kz);   // Fallback to Kazakh if Russian is missing
        
        const photos = JSON.parse(row.photos || '[]');
        
        // Get options for this question with same logic as findAll
        const optionsSql = `
          SELECT ao.*, s.id as sub_id, s.text as sub_text, s.correct as sub_correct, s.order_index as sub_order
          FROM answer_options ao
          LEFT JOIN suboptions s ON ao.id = s.option_id
          WHERE ao.question_id = ?
          ORDER BY ao.order_index, s.order_index
        `;
        
        database.db.all(optionsSql, [id], (optErr, optionRows) => {
          if (optErr) {
            callback(optErr, null);
            return;
          }
          
          // Group options and build structure
          const questionOptions = {};
          optionRows.forEach(opt => {
            if (!questionOptions[opt.id]) {
              questionOptions[opt.id] = {
                id: opt.id,
                option_letter: opt.option_letter,
                option_text_ru: opt.option_text_ru,
                option_text_kz: opt.option_text_kz,
                order_index: opt.order_index,
                suboptions: []
              };
            }
            
            // Add suboption if it exists
            if (opt.sub_id) {
              questionOptions[opt.id].suboptions.push({
                id: opt.sub_id,
                text: opt.sub_text,
                correct: opt.sub_correct === 1,
                order_index: opt.sub_order
              });
            }
          });
          
          // Transform options to same format as findAll
          const options = Object.values(questionOptions).map(opt => {
            const optionText = questionLanguage === 'kz' ? opt.option_text_kz : opt.option_text_ru;
            
            if (opt.suboptions && opt.suboptions.length > 0) {
              return {
                text: optionText,
                suboptions: opt.suboptions
              };
            } else {
              return optionText;
            }
          });
          
          const context = row.context_id ? {
            id: row.context_id,
            text: row.context_text,
            title: row.context_title,
            photos: JSON.parse(row.context_photos || '[]')
          } : null;
          
          const question = {
            id: row.id,
            question: questionText,
            language: questionLanguage,
            answer: row.answer,
            level: row.level,
            topic: row.topic,
            photos: photos,
            created_at: row.created_at,
            updated_at: row.updated_at,
            context_id: row.context_id,
            context_text: row.context_text,
            context_title: row.context_title,
            context_photos: row.context_photos ? JSON.parse(row.context_photos) : null,
            options: options
          };
          
          callback(null, question);
        });
      }
    });
  }

  static update(id, questionData, callback) {
    const {
      question_ru,
      question_kz,
      language,
      answer,
      level,
      topic,
      photos,
      context_id
    } = questionData;

    const sql = `
      UPDATE questions 
      SET question_ru = ?, 
          question_kz = ?, 
          language = ?, 
          answer = ?, 
          level = ?, 
          topic = ?, 
          photos = ?, 
          context_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const photosJson = JSON.stringify(photos || []);

    database.db.run(sql, [
      question_ru, question_kz, language || 'ru', answer, level, topic, photosJson, context_id, id
    ], function(err) {
      if (err) {
        callback(err, null);
      } else if (this.changes === 0) {
        callback(new Error('Question not found'), null);
      } else {
        // Get updated question
        Question.findById(id, callback);
      }
    });
  }

  static delete(id, callback) {
    // First check if question exists
    Question.findById(id, (err, question) => {
      if (err) {
        callback(err, null);
        return;
      }
      if (!question) {
        callback(new Error('Question not found'), null);
        return;
      }

      // Delete question (cascade will handle answer_options and suboptions)
      const sql = 'DELETE FROM questions WHERE id = ?';
      
      database.db.run(sql, [id], function(err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { 
            id: id, 
            deleted: true, 
            message: 'Question deleted successfully' 
          });
        }
      });
    });
  }

  /**
   * OPTIMIZED METHODS FOR EXAM START PERFORMANCE
   * These methods replace the inefficient Question.findAll() calls
   */

  /**
   * Find questions by topic and level (optimized for structured exams)
   * @param {string} topic - Question topic
   * @param {number} level - Question level (1=simple, 2=complex)
   * @param {string} language - Language preference ('ru', 'kz')
   * @param {number} limit - Maximum questions to return
   * @param {Function} callback - Callback function
   */
  static findByTopicAndLevel(topic, level, language = 'ru', limit = 50, callback) {
    // Handle optional parameters
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
      limit = 50;
    }
    if (typeof limit === 'function') {
      callback = limit;
      limit = 50;
    }

    const sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      WHERE q.topic = ? AND q.level = ? 
      AND q.context_id IS NULL
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      ORDER BY RANDOM()
      LIMIT ?
    `;

    database.db.all(sql, [topic, level, limit], (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (rows.length === 0) {
        callback(null, []);
        return;
      }

      // Get options for these questions
      const questionIds = rows.map(row => row.id);
      Question._attachOptionsToQuestions(questionIds, rows, language, callback);
    });
  }

  /**
   * Find matching questions (questions with suboptions)
   * @param {string} topic - Question topic
   * @param {string} language - Language preference
   * @param {number} limit - Maximum questions to return  
   * @param {Function} callback - Callback function
   */
  static findMatchingQuestions(topic, language = 'ru', limit = 50, callback) {
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
      limit = 50;
    }
    if (typeof limit === 'function') {
      callback = limit;
      limit = 50;
    }

    const sql = `
      SELECT DISTINCT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      LEFT JOIN answer_options ao ON q.id = ao.question_id
      LEFT JOIN suboptions s ON ao.id = s.option_id
      WHERE q.topic = ? AND q.context_id IS NULL
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      AND s.id IS NOT NULL
      ORDER BY RANDOM()
      LIMIT ?
    `;

    database.db.all(sql, [topic, limit], (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (rows.length === 0) {
        callback(null, []);
        return;
      }

      const questionIds = rows.map(row => row.id);
      Question._attachOptionsToQuestions(questionIds, rows, language, callback);
    });
  }

  /**
   * Find multiple choice questions (questions with 6 options)
   * @param {string} topic - Question topic
   * @param {string} language - Language preference
   * @param {number} limit - Maximum questions to return
   * @param {Function} callback - Callback function
   */
  static findMultipleChoiceQuestions(topic, language = 'ru', limit = 50, callback) {
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
      limit = 50;
    }
    if (typeof limit === 'function') {
      callback = limit;
      limit = 50;
    }

    const sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos,
             COUNT(ao.id) as option_count
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      LEFT JOIN answer_options ao ON q.id = ao.question_id
      WHERE q.topic = ? AND q.context_id IS NULL
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      GROUP BY q.id
      HAVING option_count = 6
      ORDER BY RANDOM()
      LIMIT ?
    `;

    database.db.all(sql, [topic, limit], (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (rows.length === 0) {
        callback(null, []);
        return;
      }

      const questionIds = rows.map(row => row.id);
      Question._attachOptionsToQuestions(questionIds, rows, language, callback);
    });
  }

  /**
   * Find questions by context ID
   * @param {number} contextId - Context ID
   * @param {string} language - Language preference
   * @param {number} limit - Maximum questions to return
   * @param {Function} callback - Callback function
   */
  static findByContext(contextId, language = 'ru', limit = 10, callback) {
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
      limit = 10;
    }
    if (typeof limit === 'function') {
      callback = limit;
      limit = 10;
    }

    const sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      WHERE q.context_id = ?
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      ORDER BY RANDOM()
      LIMIT ?
    `;

    database.db.all(sql, [contextId, limit], (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (rows.length === 0) {
        callback(null, []);
        return;
      }

      const questionIds = rows.map(row => row.id);
      Question._attachOptionsToQuestions(questionIds, rows, language, callback);
    });
  }

  /**
   * Batch method to get questions for structured exam (most optimized)
   * @param {string} language - Language preference
   * @param {Object} requirements - Requirements object with topic counts
   * @param {Function} callback - Callback function
   */
  static findForStructuredExam(language = 'ru', requirements, callback) {
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
      requirements = {};
    }

    const conditions = [];
    const params = [];

    // Build OR conditions for different question types needed
    Object.entries(requirements).forEach(([key, value]) => {
      if (value.count > 0) {
        switch (key) {
          case 'simple':
            value.topics.forEach(topic => {
              conditions.push('(q.topic = ? AND q.level = 1 AND q.context_id IS NULL)');
              params.push(topic);
            });
            break;
          case 'complex':
            value.topics.forEach(topic => {
              conditions.push('(q.topic = ? AND q.level = 2 AND q.context_id IS NULL)');
              params.push(topic);
            });
            break;
          case 'matching':
            conditions.push('(q.context_id IS NULL AND EXISTS (SELECT 1 FROM answer_options ao JOIN suboptions s ON ao.id = s.option_id WHERE ao.question_id = q.id))');
            break;
          case 'multiple':
            conditions.push('(q.context_id IS NULL AND (SELECT COUNT(*) FROM answer_options WHERE question_id = q.id) = 6)');
            break;
        }
      }
    });

    if (conditions.length === 0) {
      callback(null, []);
      return;
    }

    const sql = `
      SELECT q.*, 
             c.text as context_text,
             c.title as context_title,
             c.photos as context_photos,
             CASE 
               WHEN q.level = 1 AND q.context_id IS NULL THEN 'simple'
               WHEN q.level = 2 AND q.context_id IS NULL THEN 'complex'
               WHEN q.context_id IS NULL AND EXISTS (SELECT 1 FROM answer_options ao JOIN suboptions s ON ao.id = s.option_id WHERE ao.question_id = q.id) THEN 'matching'
               WHEN q.context_id IS NULL AND (SELECT COUNT(*) FROM answer_options WHERE question_id = q.id) = 6 THEN 'multiple'
               ELSE 'other'
             END as question_type
      FROM questions q
      LEFT JOIN contexts c ON q.context_id = c.id
      WHERE (${conditions.join(' OR ')})
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      ORDER BY RANDOM()
      LIMIT 200
    `;

    database.db.all(sql, params, (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (rows.length === 0) {
        callback(null, []);
        return;
      }

      const questionIds = rows.map(row => row.id);
      Question._attachOptionsToQuestions(questionIds, rows, language, callback);
    });
  }

  /**
   * Helper method to attach options to questions
   * @param {Array} questionIds - Array of question IDs
   * @param {Array} questions - Array of question objects
   * @param {string} language - Language preference
   * @param {Function} callback - Callback function
   */
  static _attachOptionsToQuestions(questionIds, questions, language, callback) {
    if (questionIds.length === 0) {
      callback(null, []);
      return;
    }

    // Get all answer options for these questions
    const optionsSql = `
      SELECT ao.*, s.id as sub_id, s.text as sub_text, s.correct as sub_correct, s.order_index as sub_order
      FROM answer_options ao
      LEFT JOIN suboptions s ON ao.id = s.option_id
      WHERE ao.question_id IN (${questionIds.map(() => '?').join(',')})
      ORDER BY ao.question_id, ao.order_index, s.order_index
    `;

    database.db.all(optionsSql, questionIds, (optErr, optionRows) => {
      if (optErr) {
        callback(optErr, null);
        return;
      }

      // Group options by question
      const questionOptions = {};
      optionRows.forEach(opt => {
        if (!questionOptions[opt.question_id]) {
          questionOptions[opt.question_id] = {};
        }

        if (!questionOptions[opt.question_id][opt.id]) {
          questionOptions[opt.question_id][opt.id] = {
            id: opt.id,
            option_letter: opt.option_letter,
            option_text_ru: opt.option_text_ru,
            option_text_kz: opt.option_text_kz,
            order_index: opt.order_index,
            suboptions: []
          };
        }

        if (opt.sub_id) {
          questionOptions[opt.question_id][opt.id].suboptions.push({
            id: opt.sub_id,
            text: opt.sub_text,
            correct: opt.sub_correct === 1,
            order_index: opt.sub_order
          });
        }
      });

      // Transform questions to final format
      const result = questions.map(row => {
        const questionLanguage = language || row.language || 'ru';
        const questionText = questionLanguage === 'kz' ? 
          (row.question_kz || row.question_ru) : 
          (row.question_ru || row.question_kz);

        const photos = JSON.parse(row.photos || '[]');
        
        // Get options for this question
        const questionOpts = questionOptions[row.id] || {};
        const options = Object.values(questionOpts).map(opt => {
          const optionText = questionLanguage === 'kz' ? opt.option_text_kz : opt.option_text_ru;
          
          if (opt.suboptions && opt.suboptions.length > 0) {
            return {
              text: optionText,
              suboptions: opt.suboptions
            };
          } else {
            return optionText;
          }
        });

        return {
          id: row.id,
          question: questionText,
          answer: row.answer,
          level: row.level,
          topic: row.topic,
          language: questionLanguage,
          created_at: row.created_at,
          updated_at: row.updated_at,
          context_id: row.context_id,
          context_text: row.context_text,
          context_title: row.context_title,
          context_photos: row.context_photos ? JSON.parse(row.context_photos) : null,
          photos: photos,
          options: options,
          question_type: row.question_type // Added for structured exam optimization
        };
      });

      callback(null, result);
    });
  }
}

module.exports = Question;