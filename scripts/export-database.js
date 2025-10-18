#!/usr/bin/env node

/**
 * Database Export Script
 * Exports SQLite database to SQL dump format
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Get database path from config
function getDatabasePath() {
  try {
    const storageConfig = require('../src/config/storage');
    return storageConfig.databasePath;
  } catch (error) {
    console.log('⚠️  Using fallback database path');
    return process.env.DATABASE_PATH || path.join(__dirname, '../database/database.sqlite');
  }
}

const dbPath = getDatabasePath();
const outputPath = process.argv[2] || path.join(__dirname, '../backups/database-dump.sql');

// Ensure backup directory exists
const backupDir = path.dirname(outputPath);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function exportDatabase(customOutputPath = null) {
  const finalOutputPath = customOutputPath || outputPath;
  
  return new Promise((resolve, reject) => {
    console.log(`📦 Exporting database from: ${dbPath}`);
    console.log(`💾 Output file: ${finalOutputPath}`);
    
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`Database file not found: ${dbPath}`));
      return;
    }

    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    let sqlDump = `-- Math App Database Export
-- Generated on: ${new Date().toISOString()}
-- Database: ${dbPath}

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

`;

    const tables = ['contexts', 'questions', 'answer_options'];
    let completedTables = 0;

    function processTable(tableName) {
      return new Promise((resolveTable) => {
        // Get table schema
        db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
          if (err || !row) {
            console.log(`⚠️  Table ${tableName} not found, skipping...`);
            resolveTable();
            return;
          }

          sqlDump += `-- Table: ${tableName}\n`;
          sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;
          sqlDump += `${row.sql};\n\n`;

          // Get table data
          db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) {
              console.error(`❌ Error reading ${tableName}:`, err);
              resolveTable();
              return;
            }

            if (rows.length === 0) {
              console.log(`📋 Table ${tableName}: 0 rows`);
              resolveTable();
              return;
            }

            console.log(`📋 Table ${tableName}: ${rows.length} rows`);

            // Generate INSERT statements
            rows.forEach(row => {
              const columns = Object.keys(row).join(', ');
              const values = Object.values(row).map(value => {
                if (value === null) return 'NULL';
                if (typeof value === 'string') {
                  // Escape single quotes
                  return `'${value.replace(/'/g, "''")}'`;
                }
                return value;
              }).join(', ');

              sqlDump += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
            });

            sqlDump += '\n';
            resolveTable();
          });
        });
      });
    }

    // Process all tables
    Promise.all(tables.map(processTable))
      .then(() => {
        sqlDump += `COMMIT;
PRAGMA foreign_keys=ON;

-- Export completed successfully
-- Total tables exported: ${tables.length}
`;

        // Write to file
        fs.writeFileSync(finalOutputPath, sqlDump, 'utf8');
        
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
          }
          
          console.log(`✅ Database exported successfully!`);
          console.log(`📁 File size: ${(fs.statSync(finalOutputPath).size / 1024).toFixed(2)} KB`);
          console.log(`📍 Location: ${finalOutputPath}`);
          
          resolve(finalOutputPath);
        });
      })
      .catch(reject);
  });
}

// Run export if called directly
if (require.main === module) {
  exportDatabase()
    .then((filepath) => {
      console.log('\n🎉 Export completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error.message);
      process.exit(1);
    });
}

module.exports = { exportDatabase };