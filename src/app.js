const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Load environment variables
require('dotenv').config();

// Import routes
const questionRoutes = require('./routes/questions');
const contextRoutes = require('./routes/contexts');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const examRoutes = require('./routes/exams');
const userRoutes = require('./routes/users');
const asyncHandler = require('./middleware/asyncHandler');

// Initialize database
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// JSON parsing with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Routes
app.use('/api/questions', questionRoutes);
app.use('/api/contexts', contextRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);
app.use('/admin', adminRoutes);

// Configuration endpoint for frontend
app.get('/config', (req, res) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    return res.status(500).json({ 
      error: 'OpenAI API key not configured' 
    });
  }
  
  res.json({
    openaiApiKey: openaiApiKey,
    hasApiKey: true
  });
});

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
  try {
    // Check database connection
    await database.checkDatabaseConnection();
    
    res.json({ 
      status: 'OK', 
      message: 'Math App API is running',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'Error', 
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Math App API',
    version: '1.0.0',
    endpoints: {
      // Questions
      'POST /api/questions': 'Create a new question with options and photos',
      'GET /api/questions': 'Get all questions',
      'GET /api/questions/:id': 'Get specific question by ID',

      // Contexts
      'POST /api/contexts': 'Create a new context with photos',
      'GET /api/contexts': 'Get all contexts',
      'GET /api/contexts/:id': 'Get specific context by ID',
      'PUT /api/contexts/:id': 'Update context',
      'DELETE /api/contexts/:id': 'Delete context',

      // Exams (NEW)
      'POST /api/exams/start': 'Start a new exam with random questions',
      'GET /api/exams/:examId/questions': 'Get all questions for an exam',
      'POST /api/exams/:examId/submit': 'Submit exam with all answers',
      'GET /api/exams/:examId': 'Get detailed results for specific exam',
      'GET /api/exams/history/:deviceId': 'Get exam history for a device',

      // Users/Stats (NEW)
      'GET /api/users/:deviceId/stats': 'Get statistics for a device/user',

      // Files
      'GET /api/files/:filename': 'Get uploaded image files',

      // System
      'GET /config': 'Get configuration for frontend (API keys)',
      'GET /health': 'Health check',

      // Admin
      'GET /admin/export?token=': 'Export database (admin only)',
      'GET /admin/stats?token=': 'Database statistics (admin only)',
      'GET /admin/health?token=': 'Detailed health check (admin only)'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 3 files allowed.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field in file upload.' });
    }
  }
  
  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON format in request body.' });
  }
  
  // Handle custom JSON validation errors
  if (error.message === 'Invalid JSON payload') {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  
  // Handle request entity too large
  if (error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request entity too large.' });
  }
  
  // Log unknown errors
  console.error('Unhandled Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handlers for process stability
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Log error but don't exit immediately - let it complete current requests
  setTimeout(() => {
    console.error('Exiting due to uncaught exception');
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log the error but continue running
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await database.closeDatabase();
    
    // Close server
    server.close((err) => {
      if (err) {
        console.error('Error during server close:', err);
        process.exit(1);
      }
      
      console.log('Graceful shutdown completed.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/`);
});

module.exports = app;