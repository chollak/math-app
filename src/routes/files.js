const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const storageConfig = require('../config/storage');

// Serve uploaded files
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(storageConfig.uploadsPath, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Send the file
  res.sendFile(filePath);
});

module.exports = router;