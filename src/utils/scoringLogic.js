/**
 * Scoring logic for exam questions
 *
 * Rules:
 * - If 1 correct answer: 1 point if answered correctly
 * - If 2 correct answers: 1 point for 1 correct, 2 points for both correct
 * - If 3 correct answers: 0 points for 1 correct, 1 point for 2 correct, 2 points for all 3 correct
 * - Extra incorrect answers are ignored (partial credit applies)
 */

/**
 * Parse answer string into array of answer letters
 * @param {string} answerString - Answer in format "A,B,C" or "A"
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
 * Calculate points earned for a question
 * @param {string} correctAnswerString - Correct answer(s) in format "A,B,C"
 * @param {string} userAnswerString - User's answer(s) in format "A,B"
 * @returns {object} {pointsEarned: number, maxPoints: number}
 */
function calculatePoints(correctAnswerString, userAnswerString) {
  const correctAnswers = parseAnswers(correctAnswerString);
  const userAnswers = parseAnswers(userAnswerString);

  // Handle empty answers
  if (correctAnswers.length === 0) {
    return { pointsEarned: 0, maxPoints: 0 };
  }

  if (userAnswers.length === 0) {
    const maxPoints = getMaxPoints(correctAnswers.length);
    return { pointsEarned: 0, maxPoints };
  }

  // Count how many correct answers the user selected (ignore incorrect ones)
  const correctlySelected = userAnswers.filter(ua =>
    correctAnswers.includes(ua)
  ).length;

  const totalCorrectAnswers = correctAnswers.length;
  const maxPoints = getMaxPoints(totalCorrectAnswers);
  const pointsEarned = getPointsForCorrectCount(totalCorrectAnswers, correctlySelected);

  return { pointsEarned, maxPoints };
}

/**
 * Get maximum points based on number of correct answers
 * @param {number} totalCorrectAnswers - Total number of correct answers
 * @returns {number} Maximum points
 */
function getMaxPoints(totalCorrectAnswers) {
  if (totalCorrectAnswers === 1) {
    return 1;
  } else if (totalCorrectAnswers === 2) {
    return 2;
  } else if (totalCorrectAnswers >= 3) {
    return 2;
  }
  return 0;
}

/**
 * Get points earned based on total correct answers and how many user got right
 * @param {number} totalCorrectAnswers - Total number of correct answers
 * @param {number} correctlySelected - Number of correct answers user selected
 * @returns {number} Points earned
 */
function getPointsForCorrectCount(totalCorrectAnswers, correctlySelected) {
  // Single correct answer
  if (totalCorrectAnswers === 1) {
    return correctlySelected === 1 ? 1 : 0;
  }

  // Two correct answers
  if (totalCorrectAnswers === 2) {
    if (correctlySelected === 2) return 2;
    if (correctlySelected === 1) return 1;
    return 0;
  }

  // Three or more correct answers
  if (totalCorrectAnswers >= 3) {
    if (correctlySelected >= 3) return 2;  // All correct
    if (correctlySelected === 2) return 1;  // 2 out of 3+
    return 0;  // 1 or 0 correct
  }

  return 0;
}

/**
 * Calculate points for multiple questions in batch
 * @param {Array} questions - Array of {correctAnswer, userAnswer}
 * @returns {Array} Array of {pointsEarned, maxPoints}
 */
function calculateBatchPoints(questions) {
  return questions.map(q =>
    calculatePoints(q.correctAnswer, q.userAnswer)
  );
}

module.exports = {
  parseAnswers,
  calculatePoints,
  getMaxPoints,
  getPointsForCorrectCount,
  calculateBatchPoints
};
