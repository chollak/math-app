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

  static findAll(language = null, callback) {
    // Handle case where language is actually the callback (backward compatibility)
    if (typeof language === 'function') {
      callback = language;
      language = null;
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
    
    // Add language filter if specified
    if (language && (language === 'ru' || language === 'kz')) {
      sql += ` WHERE q.language = ?`;
      params.push(language);
    }
    
    sql += `
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `;

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
            // Use the requested language filter or fallback to question's language
            const questionLanguage = language || row.language || 'ru';
            const questionText = questionLanguage === 'kz' ? row.question_kz : row.question_ru;
            
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
              language: language,
              answer: row.answer,
              level: row.level,
              topic: row.topic,
              photos: photos,
              created_at: row.created_at,
              updated_at: row.updated_at,
              options: options,
              context: context
            };
          });
          
          callback(null, questions);
        });
      }
    });
  }

  static findById(id, callback) {
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
        const language = row.language || 'ru';
        const questionText = language === 'kz' ? row.question_kz : row.question_ru;
        const photos = JSON.parse(row.photos || '[]');
        
        const context = row.context_id ? {
          id: row.context_id,
          text: row.context_text,
          title: row.context_title,
          photos: JSON.parse(row.context_photos || '[]')
        } : null;
        
        const question = {
          id: row.id,
          question: questionText,
          language: language,
          answer: row.answer,
          level: row.level,
          topic: row.topic,
          photos: photos,
          created_at: row.created_at,
          updated_at: row.updated_at,
          context: context
        };
        
        callback(null, question);
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
}

module.exports = Question;