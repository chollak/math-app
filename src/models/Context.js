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
}

module.exports = Context;