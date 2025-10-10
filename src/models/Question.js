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

  static findAll(callback) {
    const sql = `
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
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `;

    database.db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Transform data to new format
        const questions = rows.map(row => {
          const language = row.language || 'ru';
          const questionText = language === 'kz' ? row.question_kz : row.question_ru;
          
          // Parse photos and options
          const photos = JSON.parse(row.photos || '[]');
          const options = row.options_data ? row.options_data.split(',') : [];
          
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
}

module.exports = Question;