const database = require('../config/database');
const Suboption = require('./Suboption');

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
      
      // Handle different option formats
      let optionTextRu = null;
      let optionTextKz = null;
      let suboptions = null;
      
      if (typeof option === 'string') {
        // Simple string format
        if (language === 'kz') {
          optionTextKz = option;
        } else {
          optionTextRu = option;
        }
      } else if (typeof option === 'object') {
        if (option.text && option.suboptions) {
          // New format with suboptions
          if (language === 'kz') {
            optionTextKz = option.text;
          } else {
            optionTextRu = option.text;
          }
          suboptions = option.suboptions;
        } else {
          // Old format - object with separate language fields
          optionTextRu = option.option_text_ru;
          optionTextKz = option.option_text_kz;
        }
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
        
        const optionId = this.lastID;
        const resultOption = {
          id: optionId,
          question_id: questionId,
          option_letter: optionLetter,
          option_text_ru: optionTextRu,
          option_text_kz: optionTextKz,
          order_index: index
        };
        
        // Create suboptions if they exist
        if (suboptions && suboptions.length > 0) {
          Suboption.createBatch(optionId, suboptions, (subErr, createdSuboptions) => {
            if (subErr) {
              callback(subErr, null);
              return;
            }
            
            resultOption.suboptions = createdSuboptions;
            results.push(resultOption);
            
            completed++;
            if (completed === options.length) {
              stmt.finalize();
              callback(null, results);
            }
          });
        } else {
          results.push(resultOption);
          completed++;
          if (completed === options.length) {
            stmt.finalize();
            callback(null, results);
          }
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
        // Get suboptions for all options
        const optionIds = rows.map(row => row.id);
        
        if (optionIds.length === 0) {
          return callback(null, rows);
        }
        
        Suboption.findByOptionIds(optionIds, (subErr, suboptions) => {
          if (subErr) {
            callback(subErr, null);
          } else {
            // Attach suboptions to their respective options
            const enrichedRows = rows.map(row => ({
              ...row,
              suboptions: suboptions[row.id] || []
            }));
            callback(null, enrichedRows);
          }
        });
      }
    });
  }
}

module.exports = AnswerOption;