const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const examController = require('../controllers/examController');

/**
 * GET /api/exams/readiness
 * Check exam readiness for structured 40-question exams
 */
router.get('/readiness', asyncHandler(examController.checkExamReadiness));

/**
 * GET /api/exams/cache-stats
 * Get cache statistics for performance monitoring
 */
router.get('/cache-stats', asyncHandler(examController.getCacheStats));

/**
 * GET /api/exams/history/:deviceId
 * Get exam history for a device (moved before dynamic routes)
 */
router.get('/history/:deviceId', asyncHandler(examController.getExamHistory));

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
 * GET /api/exams/:examId
 * Get detailed results for a specific exam
 */
router.get('/:examId', asyncHandler(examController.getExamDetails));

module.exports = router;
