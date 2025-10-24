const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const examController = require('../controllers/examController');

/**
 * POST /api/exams/start
 * Start a new exam
 * Body: { deviceId: string, questionCount: number, filters: { topic, level } }
 */
router.post('/start', asyncHandler(examController.startExam));

/**
 * GET /api/exams/:examId/questions
 * Get all questions for an exam
 */
router.get('/:examId/questions', asyncHandler(examController.getExamQuestions));

/**
 * POST /api/exams/:examId/submit
 * Submit exam with all answers
 * Body: { deviceId: string, answers: [{ questionId: number, answer: string }] }
 */
router.post('/:examId/submit', asyncHandler(examController.submitExam));

/**
 * GET /api/exams/history/:deviceId
 * Get exam history for a device
 */
router.get('/history/:deviceId', asyncHandler(examController.getExamHistory));

/**
 * GET /api/exams/:examId
 * Get detailed results for a specific exam
 */
router.get('/:examId', asyncHandler(examController.getExamDetails));

module.exports = router;
