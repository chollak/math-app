/**
 * OPTIMIZED Question selector utilities for structured exam generation
 * Replaces inefficient Question.findAll() calls with targeted queries
 * Includes intelligent caching for maximum performance
 */

const Question = require('../models/Question');
const Context = require('../models/Context');
const examCache = require('./examCache');
const { randomChoice, fisherYatesShuffle, removeDuplicatesBy } = require('./randomizer');

/**
 * Get questions by specific criteria (OPTIMIZED VERSION)
 * Uses targeted SQL queries instead of loading all questions
 * @param {Object} criteria - Selection criteria
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of questions
 */
function getQuestionsByCriteria(criteria, language = 'ru') {
  return new Promise((resolve, reject) => {
    // Use optimized methods based on criteria
    if (criteria.topic && criteria.levelRequired && criteria.level) {
      // Use optimized findByTopicAndLevel
      Question.findByTopicAndLevel(criteria.topic, criteria.level, language, 50, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }
        // Apply additional filters if needed
        const filtered = questions.filter(q => matchesCriteria(q, criteria));
        resolve(filtered);
      });
    } else if (criteria.hasSuboptions) {
      // Use optimized findMatchingQuestions
      Question.findMatchingQuestions(criteria.topic, language, 50, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }
        const filtered = questions.filter(q => matchesCriteria(q, criteria));
        resolve(filtered);
      });
    } else if (criteria.optionCount === 6) {
      // Use optimized findMultipleChoiceQuestions
      Question.findMultipleChoiceQuestions(criteria.topic, language, 50, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }
        const filtered = questions.filter(q => matchesCriteria(q, criteria));
        resolve(filtered);
      });
    } else {
      // Fallback to old method for edge cases
      Question.findAll(language, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }
        const filtered = questions.filter(q => matchesCriteria(q, criteria));
        resolve(filtered);
      });
    }
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
 * Get simple questions (positions 1-15) - OPTIMIZED WITH CACHE
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of simple questions
 */
async function getSimpleQuestions(topic, language = 'ru') {
  // Check cache first
  const cached = examCache.get('simple', topic, language);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    Question.findByTopicAndLevel(topic, 1, language, 50, (err, questions) => {
      if (err) {
        reject(err);
        return;
      }
      // Filter for 4 options and no suboptions
      const filtered = questions.filter(q => 
        q.options.length === 4 && 
        !q.options.some(opt => typeof opt === 'object' && opt.suboptions)
      );
      
      // Cache the result
      examCache.set('simple', topic, language, filtered);
      resolve(filtered);
    });
  });
}

/**
 * Get complex questions (positions 16-25) - OPTIMIZED WITH CACHE
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of complex questions
 */
async function getComplexQuestions(topic, language = 'ru') {
  // Check cache first
  const cached = examCache.get('complex', topic, language);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    Question.findByTopicAndLevel(topic, 2, language, 50, (err, questions) => {
      if (err) {
        reject(err);
        return;
      }
      // Filter for 4 options and no suboptions
      const filtered = questions.filter(q => 
        q.options.length === 4 && 
        !q.options.some(opt => typeof opt === 'object' && opt.suboptions)
      );
      
      // Cache the result
      examCache.set('complex', topic, language, filtered);
      resolve(filtered);
    });
  });
}

/**
 * Get matching questions (positions 31-35) - OPTIMIZED WITH CACHE
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of matching questions
 */
async function getMatchingQuestions(topic, language = 'ru') {
  // Check cache first
  const cached = examCache.get('matching', topic, language);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    Question.findMatchingQuestions(topic, language, 50, (err, questions) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Cache the result
      examCache.set('matching', topic, language, questions);
      resolve(questions);
    });
  });
}

/**
 * Get multiple choice questions (positions 36-40) - OPTIMIZED WITH CACHE
 * @param {string} topic - Topic name
 * @param {string} language - Language preference
 * @returns {Promise<Array>} Array of multiple choice questions
 */
async function getMultipleChoiceQuestions(topic, language = 'ru') {
  // Check cache first
  const cached = examCache.get('multiple', topic, language);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    Question.findMultipleChoiceQuestions(topic, language, 50, (err, questions) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Cache the result
      examCache.set('multiple', topic, language, questions);
      resolve(questions);
    });
  });
}

/**
 * Find context with enough questions for context section (positions 26-30) - OPTIMIZED
 * @param {string} language - Language preference
 * @returns {Promise<Object|null>} Context with questions or null
 */
async function findContextWithQuestions(language = 'ru') {
  return new Promise((resolve, reject) => {
    // Use optimized method to find context with sufficient questions
    Context.findWithSufficientQuestions(5, language, (err, contextData) => {
      if (err) {
        reject(err);
        return;
      }

      if (!contextData) {
        resolve(null);
        return;
      }

      // Get the questions for this context
      Question.findByContext(contextData.id, language, 5, (err, questions) => {
        if (err) {
          reject(err);
          return;
        }

        if (questions.length < 5) {
          resolve(null);
          return;
        }

        // Перемешиваем вопросы контекста и берем первые 5
        const shuffledQuestions = fisherYatesShuffle([...questions]);

        // Return context with questions in the expected format
        resolve({
          context: {
            id: contextData.id,
            text: contextData.text,
            title: contextData.title,
            photos: contextData.photos
          },
          questions: shuffledQuestions.slice(0, 5) // Take exactly 5 questions
        });
      });
    });
  });
}

/**
 * Select random question from array, excluding already selected ones
 * @param {Array} questions - Array of questions
 * @param {Array} excludeIds - Array of question IDs to exclude (default: [])
 * @returns {Object|null} Selected question or null
 */
function selectRandomQuestion(questions, excludeIds = []) {
  if (!questions || questions.length === 0) {
    return null;
  }
  
  // Фильтруем вопросы, исключая уже выбранные
  const availableQuestions = questions.filter(q => !excludeIds.includes(q.id));
  
  if (availableQuestions.length === 0) {
    // Если нет доступных вопросов, возвращаем null
    console.warn('No available questions after exclusion filter');
    return null;
  }
  
  // Используем качественный randomChoice вместо Math.floor(Math.random())
  return randomChoice(availableQuestions);
}

/**
 * Select questions for structured exam - HEAVILY OPTIMIZED
 * Uses batch queries and parallel processing to minimize database calls
 * @param {Array} structure - Exam structure array
 * @param {string} language - Language preference
 * @returns {Promise<Object>} Selection result with questions and issues
 */
async function selectStructuredQuestions(structure, language = 'ru') {
  const selectedQuestions = [];
  const issues = [];
  const selectedQuestionIds = []; // Отслеживание уже выбранных вопросов
  let contextGroup = null;

  try {
    // Group structure by type and topic for batch processing
    const groupedStructure = {
      simple: {},
      complex: {},
      matching: [],
      multiple: [],
      context: []
    };

    structure.forEach(item => {
      switch (item.type) {
        case 'simple':
          if (!groupedStructure.simple[item.topic]) {
            groupedStructure.simple[item.topic] = [];
          }
          groupedStructure.simple[item.topic].push(item);
          break;
        case 'complex':
          if (!groupedStructure.complex[item.topic]) {
            groupedStructure.complex[item.topic] = [];
          }
          groupedStructure.complex[item.topic].push(item);
          break;
        case 'matching':
          groupedStructure.matching.push(item);
          break;
        case 'multiple':
          groupedStructure.multiple.push(item);
          break;
        case 'context':
          groupedStructure.context.push(item);
          break;
      }
    });

    // Parallel batch processing
    const promises = [];
    const questionPools = {};

    // Batch load simple questions by topic
    Object.keys(groupedStructure.simple).forEach(topic => {
      promises.push(
        getSimpleQuestions(topic, language).then(questions => {
          questionPools[`simple_${topic}`] = questions;
        }).catch(err => {
          console.warn(`Error loading simple questions for ${topic}:`, err.message);
          questionPools[`simple_${topic}`] = [];
        })
      );
    });

    // Batch load complex questions by topic
    Object.keys(groupedStructure.complex).forEach(topic => {
      promises.push(
        getComplexQuestions(topic, language).then(questions => {
          questionPools[`complex_${topic}`] = questions;
        }).catch(err => {
          console.warn(`Error loading complex questions for ${topic}:`, err.message);
          questionPools[`complex_${topic}`] = [];
        })
      );
    });

    // Load matching questions (collect all topics needed)
    const matchingTopics = [...new Set(groupedStructure.matching.map(item => item.topic))];
    matchingTopics.forEach(topic => {
      promises.push(
        getMatchingQuestions(topic, language).then(questions => {
          questionPools[`matching_${topic}`] = questions;
        }).catch(err => {
          console.warn(`Error loading matching questions for ${topic}:`, err.message);
          questionPools[`matching_${topic}`] = [];
        })
      );
    });

    // Load multiple choice questions (collect all topics needed)
    const multipleTopics = [...new Set(groupedStructure.multiple.map(item => item.topic))];
    multipleTopics.forEach(topic => {
      promises.push(
        getMultipleChoiceQuestions(topic, language).then(questions => {
          questionPools[`multiple_${topic}`] = questions;
        }).catch(err => {
          console.warn(`Error loading multiple choice questions for ${topic}:`, err.message);
          questionPools[`multiple_${topic}`] = [];
        })
      );
    });

    // Load context questions if needed
    if (groupedStructure.context.length > 0) {
      promises.push(
        findContextWithQuestions(language).then(context => {
          contextGroup = context;
        }).catch(err => {
          console.warn('Error loading context questions:', err.message);
          contextGroup = null;
        })
      );
    }

    // Wait for all parallel loads to complete
    await Promise.all(promises);

    // Now assign questions from loaded pools
    for (const item of structure) {
      let selectedQuestion = null;

      switch (item.type) {
        case 'simple':
          const simplePool = questionPools[`simple_${item.topic}`] || [];
          selectedQuestion = selectRandomQuestion(simplePool, selectedQuestionIds);
          if (!selectedQuestion) {
            issues.push(`No simple questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'complex':
          const complexPool = questionPools[`complex_${item.topic}`] || [];
          selectedQuestion = selectRandomQuestion(complexPool, selectedQuestionIds);
          if (!selectedQuestion) {
            issues.push(`No complex questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'context':
          if (!contextGroup) {
            issues.push(`No context with 5+ questions found for positions 26-30`);
            break;
          }
          
          const contextQuestionIndex = item.position - 26; // 0-4
          if (contextGroup.questions[contextQuestionIndex]) {
            selectedQuestion = contextGroup.questions[contextQuestionIndex];
          } else {
            issues.push(`Not enough context questions for position ${item.position}`);
          }
          break;

        case 'matching':
          const matchingPool = questionPools[`matching_${item.topic}`] || [];
          selectedQuestion = selectRandomQuestion(matchingPool, selectedQuestionIds);
          if (!selectedQuestion) {
            issues.push(`No matching questions found for topic: ${item.topic} at position ${item.position}`);
          }
          break;

        case 'multiple':
          const multiplePool = questionPools[`multiple_${item.topic}`] || [];
          selectedQuestion = selectRandomQuestion(multiplePool, selectedQuestionIds);
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
        
        // Добавляем ID выбранного вопроса в список исключений
        selectedQuestionIds.push(selectedQuestion.id);
      }
    }

  } catch (error) {
    console.error('Error in selectStructuredQuestions:', error);
    issues.push(`Critical error in question selection: ${error.message}`);
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