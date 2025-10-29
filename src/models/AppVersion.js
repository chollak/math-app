const database = require('../config/database');

class AppVersion {
  // Get current app version information
  static getCurrent(platform, callback) {
    if (!platform || platform === 'all') {
      // Get 'all' platform version
      const sql = 'SELECT * FROM app_versions WHERE platform = ? ORDER BY updated_at DESC LIMIT 1';
      const params = ['all'];

      database.db.get(sql, params, (err, row) => {
        if (err) {
          callback(err, null);
        } else if (!row) {
          // Return default values if no record exists
          callback(null, {
            platform: 'all',
            min_version: '1.0.0',
            latest_version: '1.0.0',
            update_url_ios: '',
            update_url_android: '',
            force_update: false,
            updated_at: new Date().toISOString()
          });
        } else {
          callback(null, row);
        }
      });
    } else {
      // First try to get specific platform
      const specificSql = 'SELECT * FROM app_versions WHERE platform = ? ORDER BY updated_at DESC LIMIT 1';

      database.db.get(specificSql, [platform], (err, row) => {
        if (err) {
          callback(err, null);
        } else if (row) {
          callback(null, row);
        } else {
          // Fallback to 'all' platform
          const fallbackSql = 'SELECT * FROM app_versions WHERE platform = ? ORDER BY updated_at DESC LIMIT 1';
          database.db.get(fallbackSql, ['all'], (err2, row2) => {
            if (err2) {
              callback(err2, null);
            } else if (!row2) {
              // Return default values if no record exists
              callback(null, {
                platform: platform,
                min_version: '1.0.0',
                latest_version: '1.0.0',
                update_url_ios: '',
                update_url_android: '',
                force_update: false,
                updated_at: new Date().toISOString()
              });
            } else {
              callback(null, row2);
            }
          });
        }
      });
    }
  }

  // Get all platform versions
  static getAll(callback) {
    const sql = 'SELECT * FROM app_versions ORDER BY platform, updated_at DESC';

    database.db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, rows);
      }
    });
  }

  // Update or create version information
  static upsert(versionData, callback) {
    const {
      platform = 'all',
      min_version,
      latest_version,
      update_url_ios,
      update_url_android,
      force_update = false
    } = versionData;

    // Check if record exists
    const checkSql = 'SELECT id FROM app_versions WHERE platform = ?';

    database.db.get(checkSql, [platform], (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }

      if (row) {
        // Update existing record
        const updateSql = `
          UPDATE app_versions
          SET min_version = ?,
              latest_version = ?,
              update_url_ios = ?,
              update_url_android = ?,
              force_update = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE platform = ?
        `;

        database.db.run(updateSql, [
          min_version,
          latest_version,
          update_url_ios || '',
          update_url_android || '',
          force_update ? 1 : 0,
          platform
        ], function(updateErr) {
          if (updateErr) {
            callback(updateErr, null);
          } else {
            callback(null, {
              platform,
              min_version,
              latest_version,
              update_url_ios: update_url_ios || '',
              update_url_android: update_url_android || '',
              force_update,
              updated_at: new Date().toISOString()
            });
          }
        });
      } else {
        // Insert new record
        const insertSql = `
          INSERT INTO app_versions (platform, min_version, latest_version, update_url_ios, update_url_android, force_update)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        database.db.run(insertSql, [
          platform,
          min_version,
          latest_version,
          update_url_ios || '',
          update_url_android || '',
          force_update ? 1 : 0
        ], function(insertErr) {
          if (insertErr) {
            callback(insertErr, null);
          } else {
            callback(null, {
              id: this.lastID,
              platform,
              min_version,
              latest_version,
              update_url_ios: update_url_ios || '',
              update_url_android: update_url_android || '',
              force_update,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
      }
    });
  }
}

module.exports = AppVersion;
