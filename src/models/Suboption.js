const database = require('../config/database');

class Suboption {
  static createBatch(optionId, suboptions, callback) {
    if (!suboptions || suboptions.length === 0) {
      return callback(null, []);
    }

    const sql = `
      INSERT INTO suboptions (
        option_id, text, correct, order_index
      ) VALUES (?, ?, ?, ?)
    `;

    const stmt = database.db.prepare(sql);
    const results = [];
    let completed = 0;

    suboptions.forEach((suboption, index) => {
      const text = suboption.text;
      const correct = suboption.correct ? 1 : 0;
      
      stmt.run([
        optionId,
        text,
        correct,
        index
      ], function(err) {
        if (err) {
          callback(err, null);
          return;
        }
        
        results.push({
          id: this.lastID,
          option_id: optionId,
          text: text,
          correct: correct === 1,
          order_index: index
        });
        
        completed++;
        if (completed === suboptions.length) {
          stmt.finalize();
          callback(null, results);
        }
      });
    });
  }

  static findByOptionId(optionId, callback) {
    const sql = `
      SELECT * FROM suboptions 
      WHERE option_id = ? 
      ORDER BY order_index
    `;
    
    database.db.all(sql, [optionId], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Convert correct field from 0/1 to boolean
        const suboptions = rows.map(row => ({
          ...row,
          correct: row.correct === 1
        }));
        callback(null, suboptions);
      }
    });
  }

  static findByOptionIds(optionIds, callback) {
    if (!optionIds || optionIds.length === 0) {
      return callback(null, {});
    }

    const placeholders = optionIds.map(() => '?').join(',');
    const sql = `
      SELECT * FROM suboptions 
      WHERE option_id IN (${placeholders})
      ORDER BY option_id, order_index
    `;
    
    database.db.all(sql, optionIds, (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Group suboptions by option_id
        const grouped = {};
        rows.forEach(row => {
          if (!grouped[row.option_id]) {
            grouped[row.option_id] = [];
          }
          grouped[row.option_id].push({
            ...row,
            correct: row.correct === 1
          });
        });
        callback(null, grouped);
      }
    });
  }

  static deleteByOptionId(optionId, callback) {
    const sql = 'DELETE FROM suboptions WHERE option_id = ?';
    database.db.run(sql, [optionId], callback);
  }
}

module.exports = Suboption;