const Exam = require('../models/Exam');
const ExamQuestion = require('../models/ExamQuestion');
const Question = require('../models/Question');
const AnswerOption = require('../models/AnswerOption');
const Context = require('../models/Context');
const { calculatePoints, getMaxPoints, parseAnswers } = require('../utils/scoringLogic');
const { keysToCamel, keysToSnake } = require('../utils/caseConverter');
const { getValidatedLanguage, createLanguageError } = require('../utils/languageHelper');
const { getExamStructure } = require('../config/examStructure');
const { selectStructuredQuestions } = require('../utils/questionSelector');
const { generateReadinessReport } = require('../utils/examValidator');

/**
 * Start a new exam
 * POST /api/exams/start
 * Body: { deviceId, questionCount, filters }
 */
async function startExam(req, res) {
  try {
    // Convert camelCase to snake_case for database
    const body = keysToSnake(req.body);
    const { device_id, question_count = 45, filters = {} } = body;

    // Validate deviceId
    if (!device_id) {
      return res.status(400).json({
        error: 'deviceId is required'
      });
    }

    // Get language from headers (preferred), filters, or query parameters
    const language = getValidatedLanguage(req, filters);
    
    // Check for invalid language that was explicitly provided
    const rawLanguage = req.headers['accept-language'] || 
                       req.headers['x-app-language'] || 
                       req.query.language ||
                       filters.language;
    
    if (rawLanguage && !language) {
      return res.status(400).json(createLanguageError(rawLanguage));
    }

    // Validate questionCount
    const questionCountNum = parseInt(question_count);
    if (isNaN(questionCountNum) || questionCountNum <= 0 || questionCountNum > 200) {
      return res.status(400).json({
        error: 'questionCount must be between 1 and 200'
      });
    }

    let selectedQuestions = [];
    let selectionIssues = [];
    let contextUsed = null;

    // Check if this is a structured 40-question exam
    if (questionCountNum === 40) {
      console.log('Generating structured 40-question exam...');
      
      // Use structured question selection
      const examStructure = getExamStructure();
      const selectionResult = await selectStructuredQuestions(examStructure, language);
      
      selectedQuestions = selectionResult.questions.map(item => item.question);
      selectionIssues = selectionResult.issues;
      contextUsed = selectionResult.contextUsed;
      
      // Log any issues but continue with available questions
      if (selectionIssues.length > 0) {
        console.warn('Exam generation issues:', selectionIssues);
      }
      
      // If we couldn't get enough questions, fallback to random selection
      if (selectedQuestions.length < 30) { // Allow some flexibility
        console.warn(`Only ${selectedQuestions.length} structured questions found, falling back to random selection`);
        selectedQuestions = [];
      }
    }

    // Fallback to random selection for non-40 question exams or if structured selection failed
    if (selectedQuestions.length === 0) {
      console.log('Using random question selection...');
      
      // Get all available questions (convert callback to Promise)
      const allQuestions = await new Promise((resolve, reject) => {
        Question.findAll(language, (err, questions) => {
          if (err) reject(err);
          else resolve(questions || []);
        });
      });

      if (allQuestions.length === 0) {
        return res.status(400).json({
          error: 'No questions available in the database'
        });
      }

      // Apply filters if provided
      let filteredQuestions = allQuestions;

      if (filters.topic) {
        filteredQuestions = filteredQuestions.filter(q => q.topic === filters.topic);
      }

      if (filters.level) {
        filteredQuestions = filteredQuestions.filter(q => q.level === parseInt(filters.level));
      }

      if (filteredQuestions.length === 0) {
        return res.status(400).json({
          error: 'No questions match the specified filters'
        });
      }

      // Shuffle and select random questions
      const shuffled = filteredQuestions.sort(() => Math.random() - 0.5);
      selectedQuestions = shuffled.slice(0, Math.min(questionCountNum, shuffled.length));
    }

    // Create exam
    const examId = await Exam.create(device_id, selectedQuestions.length);

    // Create exam questions with correct answers and max points
    const examQuestions = selectedQuestions.map((q, index) => {
      const correctAnswers = parseAnswers(q.answer);
      const maxPoints = getMaxPoints(correctAnswers.length);

      return {
        questionId: q.id,
        order: index + 1,
        correctAnswer: q.answer,
        maxPoints: maxPoints
      };
    });

    await ExamQuestion.createBatch(examId, examQuestions);

    // Get exam details
    const exam = await Exam.getById(examId);

    // Prepare response data
    const responseData = {
      exam_id: examId,
      device_id: device_id,
      total_questions: selectedQuestions.length,
      question_ids: selectedQuestions.map(q => q.id),
      started_at: exam.started_at,
      status: exam.status,
      is_structured: questionCountNum === 40,
      structure_issues: selectionIssues.length > 0 ? selectionIssues : undefined,
      context_used: contextUsed ? contextUsed.id : undefined
    };

    // Remove undefined fields
    Object.keys(responseData).forEach(key => {
      if (responseData[key] === undefined) {
        delete responseData[key];
      }
    });

    // Return response in camelCase
    const response = keysToCamel(responseData);

    res.status(201).json(response);
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  }
}

/**
 * Get questions for an exam
 * GET /api/exams/:examId/questions
 */
async function getExamQuestions(req, res) {
  try {
    const examId = parseInt(req.params.examId);

    if (isNaN(examId)) {
      return res.status(400).json({ error: 'Invalid examId' });
    }

    // Check if exam exists
    const exam = await Exam.getById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Get language from headers (preferred) or query parameters
    const language = getValidatedLanguage(req);
    
    // Check for invalid language that was explicitly provided
    const rawLanguage = req.headers['accept-language'] || 
                       req.headers['x-app-language'] || 
                       req.query.language;
    
    if (rawLanguage && !language) {
      return res.status(400).json(createLanguageError(rawLanguage));
    }

    // Get all questions for this exam with full question data
    const examQuestions = await ExamQuestion.getAllWithQuestionData(examId);

    // For each question, get question details using unified format
    const questionsWithDetails = await Promise.all(
      examQuestions.map(async (eq) => {
        // Get full question data using unified Question.findById method
        const questionData = await new Promise((resolve, reject) => {
          Question.findById(eq.question_id, language, (err, question) => {
            if (err) reject(err);
            else resolve(question);
          });
        });

        if (!questionData) {
          // Fallback to raw data if question not found
          return {
            order: eq.question_order,
            question_id: eq.question_id,
            question: eq.question_ru || eq.question_kz,
            language: eq.language,
            topic: eq.topic,
            level: eq.level,
            photos: [],
            options: [],
            context: null,
            max_points: eq.max_points
          };
        }

        return {
          order: eq.question_order,
          question_id: eq.question_id,
          question: questionData.question,
          language: questionData.language,
          topic: questionData.topic,
          level: questionData.level,
          photos: questionData.photos,
          options: questionData.options,
          context_id: questionData.context_id,
          context_text: questionData.context_text,
          context_title: questionData.context_title,
          context_photos: questionData.context_photos,
          max_points: eq.max_points
        };
      })
    );

    // Convert to camelCase
    const response = keysToCamel(questionsWithDetails);

    res.json(response);
  } catch (error) {
    console.error('Error getting exam questions:', error);
    res.status(500).json({ error: 'Failed to get exam questions' });
  }
}

/**
 * Submit exam with all answers
 * POST /api/exams/:examId/submit
 * Body: { deviceId, answers: [{ questionId, answer }, ...] }
 */
async function submitExam(req, res) {
  try {
    const examId = parseInt(req.params.examId);

    if (isNaN(examId)) {
      return res.status(400).json({ error: 'Invalid examId' });
    }

    // Convert camelCase to snake_case
    const body = keysToSnake(req.body);
    const { device_id, answers = [] } = body;

    // Validate deviceId
    if (!device_id) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Check if exam exists and belongs to this device
    const exam = await Exam.getById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (exam.device_id !== device_id) {
      return res.status(403).json({ error: 'This exam does not belong to this device' });
    }

    if (exam.status === 'completed') {
      return res.status(400).json({ error: 'This exam has already been submitted' });
    }

    // Get all exam questions to get correct answers
    const examQuestions = await ExamQuestion.getByExamId(examId);

    // Create a map of questionId -> correct answer
    const correctAnswersMap = {};
    examQuestions.forEach(eq => {
      correctAnswersMap[eq.question_id] = eq.correct_answer;
    });

    // Calculate points for each answer
    const answersWithPoints = answers.map(a => {
      const correctAnswer = correctAnswersMap[a.question_id];

      if (!correctAnswer) {
        // Question not in this exam
        return null;
      }

      const { pointsEarned, maxPoints } = calculatePoints(
        correctAnswer,
        a.answer || ''
      );

      return {
        questionId: a.question_id,
        userAnswer: a.answer || '',
        pointsEarned: pointsEarned
      };
    }).filter(a => a !== null);

    // Update all answers in batch
    if (answersWithPoints.length > 0) {
      await ExamQuestion.updateAnswersBatch(examId, answersWithPoints);
    }

    // Calculate total points
    const { totalPoints, maxPossiblePoints } = await ExamQuestion.calculateTotalPoints(examId);

    // Mark exam as completed
    await Exam.complete(examId, totalPoints, maxPossiblePoints);

    // Get detailed results
    const detailedResults = await Exam.getDetailedResults(examId);

    // Format detailed results for response - use unified question format
    const formattedResults = {
      exam: detailedResults.exam,
      questions: detailedResults.questions.map(q => {
        // Use language-specific question text (consistent with other endpoints)
        const questionLanguage = q.language || 'ru';
        const questionText = questionLanguage === 'kz' ? 
          (q.question_kz || q.question_ru) : 
          (q.question_ru || q.question_kz);
        
        return {
          question_id: q.question_id,
          question_order: q.question_order,
          question: questionText,
          language: questionLanguage,
          user_answer: q.user_answer,
          correct_answer: q.correct_answer,
          points_earned: q.points_earned,
          max_points: q.max_points,
          topic: q.topic,
          level: q.level
        };
      })
    };

    // Convert to camelCase
    const response = keysToCamel(formattedResults);

    res.json(response);
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
}

/**
 * Get exam history for a device
 * GET /api/exams/history/:deviceId
 */
async function getExamHistory(req, res) {
  try {
    const deviceId = req.params.deviceId;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Get history
    const history = await Exam.getHistory(deviceId);

    // Convert to camelCase
    const response = keysToCamel(history);

    res.json(response);
  } catch (error) {
    console.error('Error getting exam history:', error);
    res.status(500).json({ error: 'Failed to get exam history' });
  }
}

/**
 * Get detailed results for a specific exam
 * GET /api/exams/:examId
 */
async function getExamDetails(req, res) {
  try {
    const examId = parseInt(req.params.examId);

    if (isNaN(examId)) {
      return res.status(400).json({ error: 'Invalid examId' });
    }

    // Get detailed results
    const detailedResults = await Exam.getDetailedResults(examId);

    if (!detailedResults) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Convert to camelCase
    const response = keysToCamel(detailedResults);

    res.json(response);
  } catch (error) {
    console.error('Error getting exam details:', error);
    res.status(500).json({ error: 'Failed to get exam details' });
  }
}

/**
 * Get statistics for a device
 * GET /api/users/:deviceId/stats
 */
async function getUserStats(req, res) {
  try {
    const deviceId = req.params.deviceId;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Get stats
    const stats = await Exam.getStats(deviceId);

    // Convert to camelCase
    const response = keysToCamel(stats);

    res.json(response);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
}

/**
 * Check exam readiness for structured 40-question exams
 * GET /api/exams/readiness
 */
async function checkExamReadiness(req, res) {
  try {
    // Get language from query parameters or headers
    const language = getValidatedLanguage(req);
    
    // Check for invalid language that was explicitly provided
    const rawLanguage = req.headers['accept-language'] || 
                       req.headers['x-app-language'] || 
                       req.query.language;
    
    if (rawLanguage && !language) {
      return res.status(400).json(createLanguageError(rawLanguage));
    }

    // Generate readiness report
    const report = await generateReadinessReport(language);

    // Convert to camelCase
    const response = keysToCamel(report);

    res.json(response);
  } catch (error) {
    console.error('Error checking exam readiness:', error);
    res.status(500).json({ error: 'Failed to check exam readiness' });
  }
}

module.exports = {
  startExam,
  getExamQuestions,
  submitExam,
  getExamHistory,
  getExamDetails,
  getUserStats,
  checkExamReadiness
};
