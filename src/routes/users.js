const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const examController = require('../controllers/examController');

/**
 * GET /api/users/:deviceId/stats
 * Get statistics for a device/user
 */
router.get('/:deviceId/stats', asyncHandler(examController.getUserStats));

module.exports = router;
