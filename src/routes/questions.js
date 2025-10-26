const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { uploadPhotos } = require('../middleware/upload');

// Create a new question with photos and options
router.post('/', uploadPhotos, questionController.createQuestion);

// Get all questions
router.get('/', questionController.getAllQuestions);

// Get specific question by ID
router.get('/:id', questionController.getQuestionById);

// Update question by ID
router.put('/:id', uploadPhotos, questionController.updateQuestion);

// Delete question by ID
router.delete('/:id', questionController.deleteQuestion);

module.exports = router;