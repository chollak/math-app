/**
 * Enhanced scoring logic for structured 40-question exams
 * 
 * Handles different question types with specific scoring rules:
 * - Simple/Complex questions (1-25): Standard single answer
 * - Context questions (26-30): Standard single answer 
 * - Matching questions (31-35): Special scoring for suboptions
 * - Multiple choice questions (36-40): Special scoring for multiple answers
 */

/**
 * Parse answer string into array of answer letters
 * @param {string} answerString - Answer in format "A,B,C" or "A" or "A1B2"
 * @returns {Array<string>} Array of answer letters
 */
function parseAnswers(answerString) {
  if (!answerString || answerString.trim() === '') {
    return [];
  }

  return answerString
    .split(',')
    .map(a => a.trim().toUpperCase())
    .filter(a => a.length > 0);
}

/**
 * Parse matching question answers (format: "A1B2C3")
 * @param {string} answerString - Answer in matching format
 * @returns {Array<string>} Array of matching pairs
 */
function parseMatchingAnswers(answerString) {
  if (!answerString || answerString.trim() === '') {
    return [];
  }

  const matches = [];
  const clean = answerString.replace(/\s/g, '').toUpperCase();
  
  // Parse format like "A1B2" -> ["A1", "B2"]
  for (let i = 0; i < clean.length - 1; i += 2) {
    const letter = clean[i];
    const number = clean[i + 1];
    if (letter && number && /[A-Z]/.test(letter) && /[0-9]/.test(number)) {
      matches.push(letter + number);
    }
  }
  
  return matches;
}

/**
 * Calculate points for simple/complex/context questions (positions 1-30)
 * Standard single answer questions
 */
function calculateSimpleQuestionPoints(correctAnswerString, userAnswerString) {
  const correctAnswers = parseAnswers(correctAnswerString);
  const userAnswers = parseAnswers(userAnswerString);

  if (correctAnswers.length === 0) {
    return { pointsEarned: 0, maxPoints: 0 };
  }

  if (userAnswers.length === 0) {
    return { pointsEarned: 0, maxPoints: 1 };
  }

  // For simple questions, there should be exactly one correct answer
  const isCorrect = correctAnswers.length === 1 && 
                   userAnswers.length === 1 && 
                   userAnswers[0] === correctAnswers[0];

  return {
    pointsEarned: isCorrect ? 1 : 0,
    maxPoints: 1
  };
}

/**
 * Calculate points for matching questions (positions 31-35)
 * Rules:
 * - 1 из 2 = 1 балл
 * - 2 из 2 = 2 балла  
 * - 0 из 2 = 0 баллов
 */
function calculateMatchingQuestionPoints(correctAnswerString, userAnswerString) {
  const correctMatches = parseMatchingAnswers(correctAnswerString);
  const userMatches = parseMatchingAnswers(userAnswerString);

  if (correctMatches.length === 0) {
    return { pointsEarned: 0, maxPoints: 0 };
  }

  if (userMatches.length === 0) {
    return { pointsEarned: 0, maxPoints: 2 };
  }

  // Count how many correct matches the user got
  const correctCount = userMatches.filter(userMatch => 
    correctMatches.includes(userMatch)
  ).length;

  const totalCorrect = correctMatches.length;

  // Apply matching question scoring rules
  let pointsEarned = 0;
  if (totalCorrect === 2) {
    if (correctCount === 2) pointsEarned = 2;
    else if (correctCount === 1) pointsEarned = 1;
    else pointsEarned = 0;
  } else if (totalCorrect === 1) {
    if (correctCount === 1) pointsEarned = 1;
    else pointsEarned = 0;
  } else if (totalCorrect === 3) {
    if (correctCount === 3) pointsEarned = 2;
    else if (correctCount === 2) pointsEarned = 1;
    else pointsEarned = 0;
  }

  return {
    pointsEarned,
    maxPoints: 2
  };
}

/**
 * Calculate points for multiple choice questions (positions 36-40)
 * Rules:
 * - 1 из 3 = 0, 2 из 3 = 1, 3 из 3 = 2
 * - 1 из 2 = 1, 2 из 2 = 2
 * - 1 из 1 = 2
 * - 3 из 2 = 1, 3 из 1 = 0, 2 из 1 = 1
 * - 0 из любого = 0
 */
function calculateMultipleChoicePoints(correctAnswerString, userAnswerString) {
  const correctAnswers = parseAnswers(correctAnswerString);
  const userAnswers = parseAnswers(userAnswerString);

  if (correctAnswers.length === 0) {
    return { pointsEarned: 0, maxPoints: 0 };
  }

  if (userAnswers.length === 0) {
    return { pointsEarned: 0, maxPoints: 2 };
  }

  // Count how many correct answers the user selected
  const correctCount = userAnswers.filter(userAnswer => 
    correctAnswers.includes(userAnswer)
  ).length;

  const totalCorrect = correctAnswers.length;

  // Apply multiple choice scoring rules
  let pointsEarned = 0;

  if (totalCorrect === 1) {
    if (correctCount === 1) {
      pointsEarned = 2; // 1 из 1 = 2
    } else if (correctCount === 0) {
      if (userAnswers.length === 2) pointsEarned = 1; // 2 из 1 = 1
      else if (userAnswers.length >= 3) pointsEarned = 0; // 3 из 1 = 0
      else pointsEarned = 0; // 0 из 1 = 0
    }
  } else if (totalCorrect === 2) {
    if (correctCount === 2) {
      pointsEarned = 2; // 2 из 2 = 2
    } else if (correctCount === 1) {
      pointsEarned = 1; // 1 из 2 = 1
    } else if (correctCount === 0) {
      if (userAnswers.length >= 3) pointsEarned = 1; // 3 из 2 = 1
      else pointsEarned = 0; // 0 из 2 = 0
    }
  } else if (totalCorrect === 3) {
    if (correctCount === 3) {
      pointsEarned = 2; // 3 из 3 = 2
    } else if (correctCount === 2) {
      pointsEarned = 1; // 2 из 3 = 1
    } else if (correctCount === 1) {
      pointsEarned = 0; // 1 из 3 = 0
    } else {
      pointsEarned = 0; // 0 из 3 = 0
    }
  }

  return {
    pointsEarned,
    maxPoints: 2
  };
}

/**
 * Determine question type based on position in structured exam
 * @param {number} questionOrder - Question position (1-40)
 * @returns {string} Question type: 'simple', 'matching', 'multiple'
 */
function getQuestionTypeByPosition(questionOrder) {
  if (questionOrder >= 1 && questionOrder <= 30) {
    return 'simple'; // Includes simple (1-15), complex (16-25), context (26-30)
  } else if (questionOrder >= 31 && questionOrder <= 35) {
    return 'matching';
  } else if (questionOrder >= 36 && questionOrder <= 40) {
    return 'multiple';
  }
  return 'simple'; // Default fallback
}

/**
 * Calculate points for any question based on its type
 * @param {string} correctAnswerString - Correct answer(s)
 * @param {string} userAnswerString - User's answer(s)  
 * @param {number} questionOrder - Question position (1-40)
 * @param {boolean} isStructured - Whether this is a structured 40-question exam
 * @returns {object} {pointsEarned: number, maxPoints: number}
 */
function calculateStructuredPoints(correctAnswerString, userAnswerString, questionOrder = 1, isStructured = false) {
  // For non-structured exams, use simple scoring
  if (!isStructured) {
    return calculateSimpleQuestionPoints(correctAnswerString, userAnswerString);
  }

  const questionType = getQuestionTypeByPosition(questionOrder);

  switch (questionType) {
    case 'matching':
      return calculateMatchingQuestionPoints(correctAnswerString, userAnswerString);
    case 'multiple':
      return calculateMultipleChoicePoints(correctAnswerString, userAnswerString);
    case 'simple':
    default:
      return calculateSimpleQuestionPoints(correctAnswerString, userAnswerString);
  }
}

/**
 * Get maximum points for a question based on its type
 * @param {number} questionOrder - Question position (1-40)
 * @param {boolean} isStructured - Whether this is a structured exam
 * @returns {number} Maximum points
 */
function getMaxPointsForQuestion(questionOrder = 1, isStructured = false) {
  if (!isStructured) {
    return 1; // Simple questions default to 1 point
  }

  const questionType = getQuestionTypeByPosition(questionOrder);
  
  switch (questionType) {
    case 'matching':
    case 'multiple':
      return 2;
    case 'simple':
    default:
      return 1;
  }
}

/**
 * Calculate points for multiple questions in batch
 * @param {Array} questions - Array of {correctAnswer, userAnswer, questionOrder?, isStructured?}
 * @returns {Array} Array of {pointsEarned, maxPoints}
 */
function calculateBatchStructuredPoints(questions) {
  return questions.map(q =>
    calculateStructuredPoints(
      q.correctAnswer, 
      q.userAnswer, 
      q.questionOrder || 1,
      q.isStructured || false
    )
  );
}

module.exports = {
  parseAnswers,
  parseMatchingAnswers,
  calculateSimpleQuestionPoints,
  calculateMatchingQuestionPoints,
  calculateMultipleChoicePoints,
  calculateStructuredPoints,
  getQuestionTypeByPosition,
  getMaxPointsForQuestion,
  calculateBatchStructuredPoints,
  
  // Legacy exports for backward compatibility
  calculatePoints: calculateStructuredPoints,
  getMaxPoints: getMaxPointsForQuestion
};