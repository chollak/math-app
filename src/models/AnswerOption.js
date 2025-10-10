const database = require('../config/database');

class AnswerOption {
  static createBatch(questionId, options, language, callback) {
    if (!options || options.length === 0) {
      return callback(null, []);
    }

    const sql = `
      INSERT INTO answer_options (
        question_id, option_letter, option_text_ru, option_text_kz, order_index
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const stmt = database.db.prepare(sql);
    const letters = 'ABCDEFGHIJKLM';
    const results = [];
    let completed = 0;

    options.forEach((option, index) => {
      const optionLetter = letters[index];
      
      // Handle both old format (object) and new format (string)
      let optionTextRu = null;
      let optionTextKz = null;
      
      if (typeof option === 'string') {
        // New simplified format - just a string
        if (language === 'kz') {
          optionTextKz = option;
        } else {
          optionTextRu = option;
        }
      } else if (typeof option === 'object') {
        // Old format - object with separate language fields
        optionTextRu = option.option_text_ru;
        optionTextKz = option.option_text_kz;
      }
      
      stmt.run([
        questionId,
        optionLetter,
        optionTextRu,
        optionTextKz,
        index
      ], function(err) {
        if (err) {
          callback(err, null);
          return;
        }
        
        results.push({
          id: this.lastID,
          question_id: questionId,
          option_letter: optionLetter,
          option_text_ru: optionTextRu,
          option_text_kz: optionTextKz,
          order_index: index
        });
        
        completed++;
        if (completed === options.length) {
          stmt.finalize();
          callback(null, results);
        }
      });
    });
  }

  static findByQuestionId(questionId, callback) {
    const sql = `
      SELECT * FROM answer_options 
      WHERE question_id = ? 
      ORDER BY order_index
    `;
    
    database.db.all(sql, [questionId], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, rows);
      }
    });
  }
}

module.exports = AnswerOption;