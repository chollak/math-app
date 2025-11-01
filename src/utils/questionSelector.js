/**
 * Question selector utilities for structured exam generation
 */

const Question = require('../models/Question');
const Context = require('../models/Context');

/**
 * Get questions by specific criteria
 * @param {Object} criteria - Selection criteria
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of questions
 */
function getQuestionsByCriteria(criteria, language = 'ru') {
  return new Promise((resolve, reject) => {
    Question.findAll(language, (err, questions) => {
      if (err) {
        reject(err);
        return;
      }

      const filtered = questions.filter(q => matchesCriteria(q, criteria));
      resolve(filtered);
    });
  });
}

/**
 * Check if question matches criteria
 * @param {Object} question - Question object
 * @param {Object} criteria - Criteria to match
 * @returns {boolean} True if matches
 */
function matchesCriteria(question, criteria) {
  // Check topic
  if (criteria.topic && question.topic !== criteria.topic) {
    return false;
  }

  // Check level
  if (criteria.levelRequired && question.level !== criteria.level) {
    return false;
  }

  // Check option count
  if (criteria.optionCount && question.options && question.options.length !== criteria.optionCount) {
    return false;
  }

  // Check context requirement
  if (criteria.hasContext !== undefined) {
    const hasContext = question.context_id !== null && question.context_id !== undefined;
    if (criteria.hasContext !== hasContext) {
      return false;
    }
  }

  // Check suboptions requirement
  if (criteria.hasSuboptions !== undefined) {
    const hasSuboptions = question.options && question.options.some(opt => 
      typeof opt === 'object' && opt.suboptions && opt.suboptions.length > 0
    );
    if (criteria.hasSuboptions !== hasSuboptions) {
      return false;
    }
  }

  return true;
}

/**
 * Get simple questions (positions 1-15)
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of simple questions
 */
async function getSimpleQuestions(topic, language = 'ru') {
  const criteria = {
    topic,
    levelRequired: true,
    level: 1,
    optionCount: 4,
    hasContext: false,
    hasSuboptions: false
  };
  return await getQuestionsByCriteria(criteria, language);
}

/**
 * Get complex questions (positions 16-25)
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of complex questions
 */
async function getComplexQuestions(topic, language = 'ru') {
  const criteria = {
    topic,
    levelRequired: true,
    level: 2,
    optionCount: 4,
    hasContext: false,
    hasSuboptions: false
  };
  return await getQuestionsByCriteria(criteria, language);
}

/**
 * Get matching questions (positions 31-35)
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of matching questions
 */
async function getMatchingQuestions(topic, language = 'ru') {
  const criteria = {
    topic,
    hasContext: false,
    hasSuboptions: true
  };
  return await getQuestionsByCriteria(criteria, language);
}

/**
 * Get multiple choice questions (positions 36-40)
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of multiple choice questions
 */
async function getMultipleChoiceQuestions(topic, language = 'ru') {
  const criteria = {
    topic,
    optionCount: 6,
    hasContext: false,
    hasSuboptions: false
  };
  return await getQuestionsByCriteria(criteria, language);
}

/**
 * Find context with enough questions for context section (positions 26-30)
 * @param {string} language - Language preference
 * @returns {Promise<Object|null>} Context with questions or null
 */
async function findContextWithQuestions(language = 'ru') {
  return new Promise((resolve, reject) => {
    // Get all contexts
    Context.findAll((err, contexts) => {
      if (err) {
        reject(err);
        return;
      }

      if (!contexts || contexts.length === 0) {
        resolve(null);
        return;
      }

      // Get all questions with context
      Question.findAll(language, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }

        // Group questions by context_id
        const questionsByContext = {};
        questions.forEach(q => {
          if (q.context_id) {
            if (!questionsByContext[q.context_id]) {
              questionsByContext[q.context_id] = [];
            }
            questionsByContext[q.context_id].push(q);
          }
        });

        // Find context with at least 5 questions
        for (const context of contexts) {
          const contextQuestions = questionsByContext[context.id] || [];
          if (contextQuestions.length >= 5) {
            resolve({
              context,
              questions: contextQuestions.slice(0, 5) // Take exactly 5 questions
            });
            return;
          }
        }

        // No context with enough questions found
        resolve(null);
      });
    });
  });
}

/**
 * Select random question from array
 * @param {Array} questions - Array of questions
 * @returns {Object|null} Selected question or null
 */
function selectRandomQuestion(questions) {
  if (!questions || questions.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

/**
 * Select questions for structured exam
 * @param {Array} structure - Exam structure array
 * @param {string} language - Language preference
 * @returns {Promise<Object>} Selection result with questions and issues
 */
async function selectStructuredQuestions(structure, language = 'ru') {
  const selectedQuestions = [];
  const issues = [];
  let contextGroup = null;

  for (const item of structure) {
    let selectedQuestion = null;

    try {
      switch (item.type) {
        case 'simple':
          const simpleQuestions = await getSimpleQuestions(item.topic, language);
          selectedQuestion = selectRandomQuestion(simpleQuestions);
          if (!selectedQuestion) {
            issues.push(`No simple questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'complex':
          const complexQuestions = await getComplexQuestions(item.topic, language);
          selectedQuestion = selectRandomQuestion(complexQuestions);
          if (!selectedQuestion) {
            issues.push(`No complex questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'context':
          if (!contextGroup) {
            contextGroup = await findContextWithQuestions(language);
            if (!contextGroup) {
              issues.push(`No context with 5+ questions found for positions 26-30`);
              break;
            }
          }
          
          const contextQuestionIndex = item.position - 26; // 0-4
          if (contextGroup.questions[contextQuestionIndex]) {
            selectedQuestion = contextGroup.questions[contextQuestionIndex];
          } else {
            issues.push(`Not enough context questions for position ${item.position}`);
          }
          break;

        case 'matching':
          const matchingQuestions = await getMatchingQuestions(item.topic, language);
          selectedQuestion = selectRandomQuestion(matchingQuestions);
          if (!selectedQuestion) {
            issues.push(`No matching questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'multiple':
          const multipleQuestions = await getMultipleChoiceQuestions(item.topic, language);
          selectedQuestion = selectRandomQuestion(multipleQuestions);
          if (!selectedQuestion) {
            issues.push(`No multiple choice questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        default:
          issues.push(`Unknown question type: ${item.type} at position ${item.position}`);
      }

      if (selectedQuestion) {
        selectedQuestions.push({
          position: item.position,
          question: selectedQuestion,
          requiredType: item.type,
          requiredTopic: item.topic
        });
      }

    } catch (error) {
      issues.push(`Error selecting question for position ${item.position}: ${error.message}`);
    }
  }

  return {
    questions: selectedQuestions,
    issues,
    contextUsed: contextGroup ? contextGroup.context : null
  };
}

module.exports = {
  getQuestionsByCriteria,
  matchesCriteria,
  getSimpleQuestions,
  getComplexQuestions,
  getMatchingQuestions,
  getMultipleChoiceQuestions,
  findContextWithQuestions,
  selectRandomQuestion,
  selectStructuredQuestions
};