const express = require('express');
const router = express.Router();
const contextController = require('../controllers/contextController');
const { uploadPhotos } = require('../middleware/upload');

// Create a new context with photos
router.post('/', uploadPhotos, contextController.createContext);

// Get all contexts with pagination support
router.get('/', contextController.getAllContexts);

// Get specific context by ID
router.get('/:id', contextController.getContextById);

// Update context (full update - all fields required)
router.put('/:id', uploadPhotos, contextController.updateContext);

// Partially update context (optional fields, preserves photos by default)
router.patch('/:id', uploadPhotos, contextController.patchContext);

// Delete context
router.delete('/:id', contextController.deleteContext);

// Photo management endpoints
router.get('/:id/photos', contextController.getContextPhotos);
router.post('/:id/photos', uploadPhotos, contextController.addContextPhotos);
router.put('/:id/photos', uploadPhotos, contextController.replaceContextPhotos);
router.delete('/:id/photos', contextController.deleteAllContextPhotos);
router.delete('/:id/photos/:filename', contextController.deleteContextPhoto);

module.exports = router;