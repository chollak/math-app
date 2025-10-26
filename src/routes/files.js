const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// List all uploaded files
router.get('/', fileController.listFiles);

// Serve uploaded file by filename
router.get('/:filename', fileController.getFile);

// Delete uploaded file by filename
router.delete('/:filename', fileController.deleteFile);

module.exports = router;