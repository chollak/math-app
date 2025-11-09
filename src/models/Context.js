const database = require('../config/database');

class Context {
  static create(contextData, callback) {
    const {
      text,
      title,
      photos
    } = contextData;

    const sql = `
      INSERT INTO contexts (text, title, photos)
      VALUES (?, ?, ?)
    `;

    const photosJson = JSON.stringify(photos || []);

    database.db.run(sql, [text, title, photosJson], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { 
          id: this.lastID, 
          text,
          title,
          photos: photos || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  }

  static findAll(callback) {
    const sql = `
      SELECT * FROM contexts 
      ORDER BY created_at DESC
    `;

    database.db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Parse photos JSON for each context
        const contexts = rows.map(row => ({
          ...row,
          photos: JSON.parse(row.photos || '[]')
        }));
        callback(null, contexts);
      }
    });
  }

  static findById(id, callback) {
    const sql = 'SELECT * FROM contexts WHERE id = ?';
    
    database.db.get(sql, [id], (err, row) => {
      if (err) {
        callback(err, null);
      } else if (!row) {
        callback(null, null);
      } else {
        const context = {
          ...row,
          photos: JSON.parse(row.photos || '[]')
        };
        callback(null, context);
      }
    });
  }

  static update(id, contextData, callback) {
    const {
      text,
      title,
      photos
    } = contextData;

    const sql = `
      UPDATE contexts 
      SET text = ?, title = ?, photos = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const photosJson = JSON.stringify(photos || []);

    database.db.run(sql, [text, title, photosJson, id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        if (this.changes === 0) {
          callback(new Error('Context not found'), null);
        } else {
          callback(null, { 
            id: parseInt(id),
            text,
            title,
            photos: photos || [],
            updated_at: new Date().toISOString()
          });
        }
      }
    });
  }

  static delete(id, callback) {
    const sql = 'DELETE FROM contexts WHERE id = ?';
    
    database.db.run(sql, [id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        if (this.changes === 0) {
          callback(new Error('Context not found'), null);
        } else {
          callback(null, { deleted: true, id: parseInt(id) });
        }
      }
    });
  }

  /**
   * OPTIMIZED METHOD FOR EXAM START PERFORMANCE
   * Find context with sufficient questions for structured exams
   */

  /**
   * Find a context that has at least the minimum required number of questions
   * @param {number} minQuestions - Minimum number of questions required
   * @param {string} language - Language preference ('ru', 'kz')
   * @param {Function} callback - Callback function
   */
  static findWithSufficientQuestions(minQuestions = 5, language = 'ru', callback) {
    // Handle optional parameters
    if (typeof minQuestions === 'function') {
      callback = minQuestions;
      minQuestions = 5;
      language = 'ru';
    }
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
    }

    const sql = `
      SELECT c.*, 
             COUNT(q.id) as question_count,
             GROUP_CONCAT(q.id) as question_ids
      FROM contexts c
      JOIN questions q ON c.id = q.context_id
      WHERE ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      GROUP BY c.id
      HAVING question_count >= ?
      ORDER BY question_count DESC, RANDOM()
      LIMIT 1
    `;

    database.db.get(sql, [minQuestions], (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (!row) {
        callback(null, null);
        return;
      }

      // Parse the context data
      const context = {
        id: row.id,
        text: row.text,
        title: row.title,
        photos: JSON.parse(row.photos || '[]'),
        created_at: row.created_at,
        updated_at: row.updated_at,
        question_count: row.question_count,
        question_ids: row.question_ids ? row.question_ids.split(',').map(id => parseInt(id)) : []
      };

      callback(null, context);
    });
  }

  /**
   * Find contexts with question counts (useful for exam preparation analysis)
   * @param {string} language - Language preference ('ru', 'kz') 
   * @param {Function} callback - Callback function
   */
  static findAllWithQuestionCounts(language = 'ru', callback) {
    // Handle optional parameters
    if (typeof language === 'function') {
      callback = language;
      language = 'ru';
    }

    const sql = `
      SELECT c.*, 
             COUNT(q.id) as question_count
      FROM contexts c
      LEFT JOIN questions q ON c.id = q.context_id 
      AND ${language === 'kz' ? 'q.question_kz IS NOT NULL AND q.question_kz != ""' : 'q.question_ru IS NOT NULL AND q.question_ru != ""'}
      GROUP BY c.id
      ORDER BY question_count DESC, c.created_at DESC
    `;

    database.db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }

      // Parse the context data
      const contexts = rows.map(row => ({
        id: row.id,
        text: row.text,
        title: row.title,
        photos: JSON.parse(row.photos || '[]'),
        created_at: row.created_at,
        updated_at: row.updated_at,
        question_count: row.question_count || 0
      }));

      callback(null, contexts);
    });
  }
}

module.exports = Context;