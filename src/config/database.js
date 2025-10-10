const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'database.sqlite');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;
let dbConnected = false;

function connectToDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('Connected to SQLite database');
        dbConnected = true;
        initializeTables()
          .then(() => resolve(db))
          .catch(reject);
      }
    });
  });
}

// Database connection health check
function checkDatabaseConnection() {
  return new Promise((resolve, reject) => {
    if (!db || !dbConnected) {
      reject(new Error('Database not connected'));
      return;
    }
    
    db.get('SELECT 1 as test', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

// Graceful database close
function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        dbConnected = false;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Migration function to update existing tables
function runMigrations() {
  return new Promise((resolve) => {
    // Check current schema and add missing columns
    db.all("PRAGMA table_info(questions)", [], (err, columns) => {
      if (err) {
        console.log('Migration check failed, but continuing...');
        resolve();
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      const migrations = [];
      
      // Check for missing columns and add them
      if (!columnNames.includes('language')) {
        migrations.push({
          sql: "ALTER TABLE questions ADD COLUMN language TEXT DEFAULT 'ru'",
          message: 'Adding language column'
        });
      }
      
      if (!columnNames.includes('context_id')) {
        migrations.push({
          sql: "ALTER TABLE questions ADD COLUMN context_id INTEGER",
          message: 'Adding context_id column'
        });
      }
      
      if (!columnNames.includes('photos')) {
        migrations.push({
          sql: "ALTER TABLE questions ADD COLUMN photos TEXT DEFAULT '[]'",
          message: 'Adding photos column'
        });
      }
      
      // Run migrations sequentially
      if (migrations.length === 0) {
        console.log('Database schema is up to date');
        resolve();
        return;
      }
      
      let completed = 0;
      migrations.forEach(migration => {
        console.log(migration.message + '...');
        db.run(migration.sql, (err) => {
          if (err) {
            console.log(`${migration.message} might already exist, continuing...`);
          } else {
            console.log(`${migration.message} added successfully`);
          }
          
          completed++;
          if (completed === migrations.length) {
            console.log('All migrations completed');
            resolve();
          }
        });
      });
    });
  });
}

function initializeTables() {
  return new Promise((resolve, reject) => {
    // Create questions table
    const createQuestionsTable = `
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_ru TEXT,
        question_kz TEXT,
        language TEXT DEFAULT 'ru',
        answer TEXT NOT NULL,
        level INTEGER,
        context TEXT,
        context_title TEXT,
        topic TEXT,
        photo1_path TEXT,
        photo2_path TEXT,
        photo3_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create answer_options table
    const createAnswerOptionsTable = `
      CREATE TABLE IF NOT EXISTS answer_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        option_letter TEXT NOT NULL,
        option_text_ru TEXT,
        option_text_kz TEXT,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
      )
    `;

    // Create contexts table
    const createContextsTable = `
      CREATE TABLE IF NOT EXISTS contexts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        title TEXT NOT NULL,
        photos TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    let tablesCreated = 0;
    const totalTables = 3;
    let hasError = false;

    function checkCompletion() {
      if (hasError) return;
      
      tablesCreated++;
      if (tablesCreated === totalTables) {
        console.log('All database tables initialized successfully');
        // Run migration after tables are created
        runMigrations().then(() => {
          resolve();
        }).catch(reject);
      }
    }

    db.run(createQuestionsTable, (err) => {
      if (err) {
        console.error('Error creating questions table:', err.message);
        hasError = true;
        reject(err);
      } else {
        console.log('Questions table ready');
        checkCompletion();
      }
    });

    db.run(createAnswerOptionsTable, (err) => {
      if (err) {
        console.error('Error creating answer_options table:', err.message);
        hasError = true;
        reject(err);
      } else {
        console.log('Answer options table ready');
        checkCompletion();
      }
    });

    db.run(createContextsTable, (err) => {
      if (err) {
        console.error('Error creating contexts table:', err.message);
        hasError = true;
        reject(err);
      } else {
        console.log('Contexts table ready');
        checkCompletion();
      }
    });
  });
}

// Initialize database connection on module load
connectToDatabase().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

module.exports = {
  get db() { return db; },
  connectToDatabase,
  checkDatabaseConnection,
  closeDatabase,
  isConnected: () => dbConnected
};