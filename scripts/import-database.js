#!/usr/bin/env node

/**
 * Database Import Script
 * Imports SQL dump back to SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/database.sqlite');
const inputPath = process.argv[2] || path.join(__dirname, '../backups/database-dump.sql');

function importDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`📦 Importing database to: ${dbPath}`);
    console.log(`📁 Input file: ${inputPath}`);
    
    if (!fs.existsSync(inputPath)) {
      reject(new Error(`SQL dump file not found: ${inputPath}`));
      return;
    }

    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Read SQL dump
    const sqlDump = fs.readFileSync(inputPath, 'utf8');
    console.log(`📋 SQL file size: ${(sqlDump.length / 1024).toFixed(2)} KB`);

    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    // Execute SQL dump
    db.exec(sqlDump, (err) => {
      if (err) {
        console.error('❌ Error executing SQL dump:', err);
        db.close();
        reject(err);
        return;
      }

      // Verify import by counting records
      const verificationQueries = [
        'SELECT COUNT(*) as count FROM contexts',
        'SELECT COUNT(*) as count FROM questions', 
        'SELECT COUNT(*) as count FROM answer_options'
      ];

      let completed = 0;
      let totalRecords = 0;

      verificationQueries.forEach((query, index) => {
        const tableName = ['contexts', 'questions', 'answer_options'][index];
        
        db.get(query, [], (err, row) => {
          if (!err && row) {
            console.log(`✅ ${tableName}: ${row.count} records`);
            totalRecords += row.count;
          } else {
            console.log(`⚠️  ${tableName}: verification failed`);
          }
          
          completed++;
          if (completed === verificationQueries.length) {
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err);
              }
              
              console.log(`\n🎉 Import completed successfully!`);
              console.log(`📊 Total records imported: ${totalRecords}`);
              console.log(`📍 Database location: ${dbPath}`);
              
              resolve(dbPath);
            });
          }
        });
      });
    });
  });
}

// Run import if called directly
if (require.main === module) {
  importDatabase()
    .then((filepath) => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importDatabase };