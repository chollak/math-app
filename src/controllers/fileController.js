const path = require('path');
const fs = require('fs');
const storageConfig = require('../config/storage');
const database = require('../config/database');

const fileController = {
  // Serve uploaded files
  getFile: (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(storageConfig.uploadsPath, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send the file
    res.sendFile(filePath);
  },

  // Delete uploaded file
  deleteFile: async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(storageConfig.uploadsPath, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file is being used by any questions
      const checkUsageSql = `
        SELECT q.id, q.question_ru, q.question_kz 
        FROM questions q 
        WHERE q.photos LIKE ?
      `;

      const usageCheck = await new Promise((resolve, reject) => {
        database.db.all(checkUsageSql, [`%"${filename}"%`], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // Check if file is used in contexts
      const contextUsageSql = `
        SELECT c.id, c.title 
        FROM contexts c 
        WHERE c.photos LIKE ?
      `;

      const contextUsage = await new Promise((resolve, reject) => {
        database.db.all(contextUsageSql, [`%"${filename}"%`], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      const totalUsage = [...usageCheck, ...contextUsage];

      if (totalUsage.length > 0) {
        return res.status(400).json({ 
          error: 'File is being used and cannot be deleted',
          usedBy: {
            questions: usageCheck.length,
            contexts: contextUsage.length,
            details: totalUsage
          }
        });
      }

      // Delete the file
      fs.unlinkSync(filePath);

      res.json({ 
        message: 'File deleted successfully',
        filename: filename,
        deleted: true
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  },

  // List all uploaded files
  listFiles: (req, res) => {
    try {
      const files = fs.readdirSync(storageConfig.uploadsPath);
      
      const fileList = files.map(filename => {
        const filePath = path.join(storageConfig.uploadsPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/api/files/${filename}`
        };
      }).sort((a, b) => new Date(b.created) - new Date(a.created));

      res.json({
        files: fileList,
        total: fileList.length,
        totalSize: fileList.reduce((sum, file) => sum + file.size, 0)
      });

    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  }
};

module.exports = fileController;