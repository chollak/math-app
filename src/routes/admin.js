const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exportDatabase } = require('../../scripts/export-database');
const database = require('../config/database');

// Admin authentication middleware (simple token-based)
const adminAuth = (req, res, next) => {
  const adminToken = process.env.ADMIN_TOKEN || 'admin123'; // Change in production!
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  
  if (!token || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }
  
  next();
};

// Export database as SQL dump
router.get('/export', adminAuth, async (req, res) => {
  try {
    console.log('🔧 Admin: Starting database export...');
    
    // Create temporary export file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `math-app-backup-${timestamp}.sql`;
    const tempPath = path.join(__dirname, '../../temp', filename);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Export database
    await exportDatabase(tempPath);
    
    console.log(`✅ Admin: Database exported to ${tempPath}`);
    
    // Send file for download
    res.download(tempPath, filename, (err) => {
      if (err) {
        console.error('❌ Admin: Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download export file' });
        }
      }
      
      // Clean up temp file after download
      setTimeout(() => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
          console.log(`🗑️  Admin: Cleaned up temp file: ${tempPath}`);
        }
      }, 5000); // Delete after 5 seconds
    });
    
  } catch (error) {
    console.error('❌ Admin: Export failed:', error);
    res.status(500).json({ 
      error: 'Database export failed', 
      details: error.message 
    });
  }
});

// Get database statistics
router.get('/stats', adminAuth, (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      database: {
        connected: database.isConnected(),
        path: process.env.DATABASE_PATH || 'default'
      },
      tables: {}
    };
    
    const queries = [
      { name: 'contexts', sql: 'SELECT COUNT(*) as count FROM contexts' },
      { name: 'questions', sql: 'SELECT COUNT(*) as count FROM questions' },
      { name: 'answer_options', sql: 'SELECT COUNT(*) as count FROM answer_options' }
    ];
    
    let completed = 0;
    
    queries.forEach(query => {
      database.db.get(query.sql, [], (err, row) => {
        if (!err && row) {
          stats.tables[query.name] = row.count;
        } else {
          stats.tables[query.name] = 'error';
        }
        
        completed++;
        if (completed === queries.length) {
          res.json(stats);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Admin: Stats failed:', error);
    res.status(500).json({ 
      error: 'Failed to get database stats', 
      details: error.message 
    });
  }
});

// Health check with detailed info
router.get('/health', adminAuth, async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'checking...',
      database: {
        connected: false,
        responsive: false
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        database_path: process.env.DATABASE_PATH || 'default',
        openai_configured: !!process.env.OPENAI_API_KEY
      },
      uptime: process.uptime()
    };
    
    // Check database connection
    try {
      await database.checkDatabaseConnection();
      health.database.connected = true;
      health.database.responsive = true;
      health.status = 'healthy';
    } catch (error) {
      health.database.error = error.message;
      health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('❌ Admin: Health check failed:', error);
    res.status(500).json({ 
      error: 'Health check failed', 
      details: error.message 
    });
  }
});

// Clear all data (destructive operation)
router.delete('/clear-all', adminAuth, (req, res) => {
  const confirmation = req.body.confirmation;
  
  if (confirmation !== 'DELETE_ALL_DATA') {
    return res.status(400).json({ 
      error: 'Confirmation required. Send { "confirmation": "DELETE_ALL_DATA" } in request body.' 
    });
  }
  
  console.log('⚠️  Admin: CLEARING ALL DATA - this action cannot be undone!');
  
  const tables = ['answer_options', 'questions', 'contexts']; // Order matters due to foreign keys
  let completed = 0;
  let errors = [];
  
  tables.forEach(table => {
    database.db.run(`DELETE FROM ${table}`, [], function(err) {
      if (err) {
        errors.push({ table, error: err.message });
      } else {
        console.log(`🗑️  Admin: Cleared table ${table} (${this.changes} rows)`);
      }
      
      completed++;
      if (completed === tables.length) {
        if (errors.length > 0) {
          res.status(500).json({ 
            error: 'Partial failure', 
            errors: errors 
          });
        } else {
          res.json({ 
            message: 'All data cleared successfully',
            tables_cleared: tables.length
          });
        }
      }
    });
  });
});

module.exports = router;