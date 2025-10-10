const express = require('express');
const router = express.Router();
const contextController = require('../controllers/contextController');
const { uploadPhotos } = require('../middleware/upload');

// Create a new context with photos
router.post('/', uploadPhotos, contextController.createContext);

// Get all contexts
router.get('/', contextController.getAllContexts);

// Get specific context by ID
router.get('/:id', contextController.getContextById);

// Update context
router.put('/:id', uploadPhotos, contextController.updateContext);

// Delete context
router.delete('/:id', contextController.deleteContext);

module.exports = router;