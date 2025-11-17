/**
 * Exam structure configuration for 40-question standardized test
 * Each position has specific topic and question type requirements
 */

// Базовая структура экзамена (Вариант A)
const EXAM_STRUCTURE_A = [
  // Positions 1-15: Simple questions (level=1, 4 options, no context, no suboptions)
  { position: 1, topic: 'RAD', level: 1, type: 'simple' },
  { position: 2, topic: 'POW', level: 1, type: 'simple' },
  { position: 3, topic: 'TRG', level: 1, type: 'simple' },
  { position: 4, topic: 'ALG', level: 1, type: 'simple' },
  { position: 5, topic: 'EQS', level: 1, type: 'simple' },
  { position: 6, topic: 'SYS', level: 1, type: 'simple' },
  { position: 7, topic: 'CAL', level: 1, type: 'simple' },
  { position: 8, topic: 'GEO', level: 1, type: 'simple' },
  { position: 9, topic: 'INS', level: 1, type: 'simple' },
  { position: 10, topic: 'TRE', level: 1, type: 'simple' },
  { position: 11, topic: 'CAL', level: 1, type: 'simple' },
  { position: 12, topic: 'INE', level: 1, type: 'simple' },
  { position: 13, topic: 'GEO', level: 1, type: 'simple' },
  { position: 14, topic: 'CAL', level: 1, type: 'simple' },
  { position: 15, topic: 'SPA', level: 1, type: 'simple' },

  // Positions 16-25: Complex questions (level=2, 4 options, no context, no suboptions)
  { position: 16, topic: 'EXL', level: 2, type: 'complex' },
  { position: 17, topic: 'SYM', level: 2, type: 'complex' },
  { position: 18, topic: 'CAL', level: 2, type: 'complex' },
  { position: 19, topic: 'GEO', level: 2, type: 'complex' },
  { position: 20, topic: 'PRG', level: 2, type: 'complex' },
  { position: 21, topic: 'VEC', level: 2, type: 'complex' },
  { position: 22, topic: 'ALG', level: 2, type: 'complex' },
  { position: 23, topic: 'EXL', level: 2, type: 'complex' },
  { position: 24, topic: 'INE', level: 2, type: 'complex' },
  { position: 25, topic: 'CAL', level: 2, type: 'complex' },

  // Positions 26-30: Context questions (with context_id, grouped by same context)
  { position: 26, topic: null, level: null, type: 'context' },
  { position: 27, topic: null, level: null, type: 'context' },
  { position: 28, topic: null, level: null, type: 'context' },
  { position: 29, topic: null, level: null, type: 'context' },
  { position: 30, topic: null, level: null, type: 'context' },

  // Positions 31-35: Matching questions (with suboptions)
  { position: 31, topic: 'CAL', level: null, type: 'matching' },
  { position: 32, topic: 'GEO', level: null, type: 'matching' },
  { position: 33, topic: 'ALG', level: null, type: 'matching' },
  { position: 34, topic: 'EQS', level: null, type: 'matching' },
  { position: 35, topic: 'PRG', level: null, type: 'matching' },

  // Positions 36-40: Multiple choice questions (6 options, 1-3 correct answers)
  { position: 36, topic: 'ALG', level: null, type: 'multiple' },
  { position: 37, topic: 'TRG', level: null, type: 'multiple' },
  { position: 38, topic: 'PRG', level: null, type: 'multiple' },
  { position: 39, topic: 'SYM', level: null, type: 'multiple' },
  { position: 40, topic: 'SPA', level: null, type: 'multiple' }
];

// Альтернативная структура экзамена (Вариант B)
const EXAM_STRUCTURE_B = [
  // Positions 1-15: Simple questions - измененный порядок тем
  { position: 1, topic: 'GEO', level: 1, type: 'simple' },
  { position: 2, topic: 'ALG', level: 1, type: 'simple' },
  { position: 3, topic: 'CAL', level: 1, type: 'simple' },
  { position: 4, topic: 'TRG', level: 1, type: 'simple' },
  { position: 5, topic: 'SYS', level: 1, type: 'simple' },
  { position: 6, topic: 'RAD', level: 1, type: 'simple' },
  { position: 7, topic: 'EQS', level: 1, type: 'simple' },
  { position: 8, topic: 'POW', level: 1, type: 'simple' },
  { position: 9, topic: 'TRE', level: 1, type: 'simple' },
  { position: 10, topic: 'INS', level: 1, type: 'simple' },
  { position: 11, topic: 'SPA', level: 1, type: 'simple' },
  { position: 12, topic: 'GEO', level: 1, type: 'simple' },
  { position: 13, topic: 'CAL', level: 1, type: 'simple' },
  { position: 14, topic: 'INE', level: 1, type: 'simple' },
  { position: 15, topic: 'ALG', level: 1, type: 'simple' },

  // Positions 16-25: Complex questions - измененный порядок
  { position: 16, topic: 'VEC', level: 2, type: 'complex' },
  { position: 17, topic: 'PRG', level: 2, type: 'complex' },
  { position: 18, topic: 'GEO', level: 2, type: 'complex' },
  { position: 19, topic: 'CAL', level: 2, type: 'complex' },
  { position: 20, topic: 'ALG', level: 2, type: 'complex' },
  { position: 21, topic: 'EXL', level: 2, type: 'complex' },
  { position: 22, topic: 'SYM', level: 2, type: 'complex' },
  { position: 23, topic: 'INE', level: 2, type: 'complex' },
  { position: 24, topic: 'CAL', level: 2, type: 'complex' },
  { position: 25, topic: 'PRG', level: 2, type: 'complex' },

  // Positions 26-30: Context questions
  { position: 26, topic: null, level: null, type: 'context' },
  { position: 27, topic: null, level: null, type: 'context' },
  { position: 28, topic: null, level: null, type: 'context' },
  { position: 29, topic: null, level: null, type: 'context' },
  { position: 30, topic: null, level: null, type: 'context' },

  // Positions 31-35: Matching questions - другой порядок тем
  { position: 31, topic: 'PRG', level: null, type: 'matching' },
  { position: 32, topic: 'ALG', level: null, type: 'matching' },
  { position: 33, topic: 'CAL', level: null, type: 'matching' },
  { position: 34, topic: 'GEO', level: null, type: 'matching' },
  { position: 35, topic: 'EQS', level: null, type: 'matching' },

  // Positions 36-40: Multiple choice questions - другой порядок
  { position: 36, topic: 'SPA', level: null, type: 'multiple' },
  { position: 37, topic: 'SYM', level: null, type: 'multiple' },
  { position: 38, topic: 'ALG', level: null, type: 'multiple' },
  { position: 39, topic: 'PRG', level: null, type: 'multiple' },
  { position: 40, topic: 'TRG', level: null, type: 'multiple' }
];

// Еще один вариант структуры (Вариант C)
const EXAM_STRUCTURE_C = [
  // Positions 1-15: Simple questions - третий вариант порядка
  { position: 1, topic: 'CAL', level: 1, type: 'simple' },
  { position: 2, topic: 'SPA', level: 1, type: 'simple' },
  { position: 3, topic: 'ALG', level: 1, type: 'simple' },
  { position: 4, topic: 'GEO', level: 1, type: 'simple' },
  { position: 5, topic: 'TRG', level: 1, type: 'simple' },
  { position: 6, topic: 'INE', level: 1, type: 'simple' },
  { position: 7, topic: 'POW', level: 1, type: 'simple' },
  { position: 8, topic: 'RAD', level: 1, type: 'simple' },
  { position: 9, topic: 'EQS', level: 1, type: 'simple' },
  { position: 10, topic: 'CAL', level: 1, type: 'simple' },
  { position: 11, topic: 'SYS', level: 1, type: 'simple' },
  { position: 12, topic: 'TRE', level: 1, type: 'simple' },
  { position: 13, topic: 'INS', level: 1, type: 'simple' },
  { position: 14, topic: 'GEO', level: 1, type: 'simple' },
  { position: 15, topic: 'RAD', level: 1, type: 'simple' },

  // Positions 16-25: Complex questions - третий вариант
  { position: 16, topic: 'CAL', level: 2, type: 'complex' },
  { position: 17, topic: 'ALG', level: 2, type: 'complex' },
  { position: 18, topic: 'PRG', level: 2, type: 'complex' },
  { position: 19, topic: 'SYM', level: 2, type: 'complex' },
  { position: 20, topic: 'GEO', level: 2, type: 'complex' },
  { position: 21, topic: 'INE', level: 2, type: 'complex' },
  { position: 22, topic: 'VEC', level: 2, type: 'complex' },
  { position: 23, topic: 'CAL', level: 2, type: 'complex' },
  { position: 24, topic: 'EXL', level: 2, type: 'complex' },
  { position: 25, topic: 'ALG', level: 2, type: 'complex' },

  // Positions 26-30: Context questions
  { position: 26, topic: null, level: null, type: 'context' },
  { position: 27, topic: null, level: null, type: 'context' },
  { position: 28, topic: null, level: null, type: 'context' },
  { position: 29, topic: null, level: null, type: 'context' },
  { position: 30, topic: null, level: null, type: 'context' },

  // Positions 31-35: Matching questions - третий вариант
  { position: 31, topic: 'EQS', level: null, type: 'matching' },
  { position: 32, topic: 'CAL', level: null, type: 'matching' },
  { position: 33, topic: 'PRG', level: null, type: 'matching' },
  { position: 34, topic: 'ALG', level: null, type: 'matching' },
  { position: 35, topic: 'GEO', level: null, type: 'matching' },

  // Positions 36-40: Multiple choice questions - третий вариант
  { position: 36, topic: 'TRG', level: null, type: 'multiple' },
  { position: 37, topic: 'PRG', level: null, type: 'multiple' },
  { position: 38, topic: 'SYM', level: null, type: 'multiple' },
  { position: 39, topic: 'ALG', level: null, type: 'multiple' },
  { position: 40, topic: 'SPA', level: null, type: 'multiple' }
];

// Массив всех доступных структур
const EXAM_STRUCTURES = [EXAM_STRUCTURE_A, EXAM_STRUCTURE_B, EXAM_STRUCTURE_C];

// Для обратной совместимости - экспортируем первую структуру как базовую
const EXAM_STRUCTURE = EXAM_STRUCTURE_A;

/**
 * Question type criteria for filtering
 */
const QUESTION_TYPE_CRITERIA = {
  simple: {
    description: 'Simple questions with 4 options',
    criteria: {
      levelRequired: true,
      level: 1,
      optionCount: 4,
      hasContext: false,
      hasSuboptions: false
    }
  },
  complex: {
    description: 'Complex questions with 4 options',
    criteria: {
      levelRequired: true,
      level: 2,
      optionCount: 4,
      hasContext: false,
      hasSuboptions: false
    }
  },
  context: {
    description: 'Context-based questions (5 questions per context)',
    criteria: {
      levelRequired: false,
      hasContext: true,
      groupSize: 5
    }
  },
  matching: {
    description: 'Matching questions with suboptions',
    criteria: {
      levelRequired: false,
      hasContext: false,
      hasSuboptions: true
    }
  },
  multiple: {
    description: 'Multiple choice questions with 6 options',
    criteria: {
      levelRequired: false,
      optionCount: 6,
      hasContext: false,
      hasSuboptions: false
    }
  }
};

/**
 * Get exam structure for 40-question test
 * @param {boolean} randomize - Whether to randomize structure selection (default: true)
 * @returns {Array} Exam structure array
 */
function getExamStructure(randomize = true) {
  if (!randomize) {
    return EXAM_STRUCTURE; // Возвращаем базовую структуру
  }
  
  // Выбираем случайную структуру из доступных
  const randomIndex = Math.floor(Math.random() * EXAM_STRUCTURES.length);
  const selectedStructure = EXAM_STRUCTURES[randomIndex];
  
  console.log(`Selected exam structure variant: ${['A', 'B', 'C'][randomIndex]}`);
  
  return selectedStructure;
}

/**
 * Get question type criteria
 */
function getQuestionTypeCriteria(type) {
  return QUESTION_TYPE_CRITERIA[type];
}

/**
 * Get all unique topics from exam structure
 */
function getRequiredTopics() {
  const topics = new Set();
  EXAM_STRUCTURE.forEach(item => {
    if (item.topic) {
      topics.add(item.topic);
    }
  });
  return Array.from(topics);
}

/**
 * Get questions count by type
 */
function getQuestionCountByType() {
  const counts = {};
  EXAM_STRUCTURE.forEach(item => {
    counts[item.type] = (counts[item.type] || 0) + 1;
  });
  return counts;
}

module.exports = {
  EXAM_STRUCTURE,
  QUESTION_TYPE_CRITERIA,
  getExamStructure,
  getQuestionTypeCriteria,
  getRequiredTopics,
  getQuestionCountByType
};