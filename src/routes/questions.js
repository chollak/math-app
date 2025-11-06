const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { uploadPhotos } = require('../middleware/upload');

// Create a new question with photos and options
router.post('/', uploadPhotos, questionController.createQuestion);

// Get all questions with optional filtering
router.get('/', questionController.getAllQuestions);

// Get specific question by ID
router.get('/:id', questionController.getQuestionById);

// Update question by ID (full update - all fields required)
router.put('/:id', uploadPhotos, questionController.updateQuestion);

// Partially update question (optional fields, preserves photos by default)
router.patch('/:id', uploadPhotos, questionController.patchQuestion);

// Delete question by ID
router.delete('/:id', questionController.deleteQuestion);

// Photo management endpoints
router.get('/:id/photos', questionController.getQuestionPhotos);
router.post('/:id/photos', uploadPhotos, questionController.addQuestionPhotos);
router.put('/:id/photos', uploadPhotos, questionController.replaceQuestionPhotos);
router.delete('/:id/photos', questionController.deleteAllQuestionPhotos);
router.delete('/:id/photos/:filename', questionController.deleteQuestionPhoto);

module.exports = router;