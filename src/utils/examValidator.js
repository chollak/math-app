/**
 * Exam validation utilities
 */

const { getExamStructure, getQuestionCountByType } = require('../config/examStructure');
const { 
  getSimpleQuestions, 
  getComplexQuestions, 
  getMatchingQuestions, 
  getMultipleChoiceQuestions,
  findContextWithQuestions 
} = require('./questionSelector');

/**
 * Validate if database has enough questions for structured exam
 * @param {string} language - Language preference
 * @returns {Promise<Object>} Validation result
 */
async function validateStructuredExamReadiness(language = 'ru') {
  const structure = getExamStructure();
  const validation = {
    isReady: true,
    issues: [],
    warnings: [],
    topicCoverage: {},
    typeCoverage: {}
  };

  // Group structure by type for validation
  const typeGroups = {
    simple: structure.filter(item => item.type === 'simple'),
    complex: structure.filter(item => item.type === 'complex'),
    context: structure.filter(item => item.type === 'context'),
    matching: structure.filter(item => item.type === 'matching'),
    multiple: structure.filter(item => item.type === 'multiple')
  };

  try {
    // Validate simple questions (positions 1-15)
    const simpleTopics = [...new Set(typeGroups.simple.map(item => item.topic))];
    for (const topic of simpleTopics) {
      const questions = await getSimpleQuestions(topic, language);
      const needed = typeGroups.simple.filter(item => item.topic === topic).length;
      
      validation.topicCoverage[`${topic}_simple`] = {
        needed,
        available: questions.length,
        sufficient: questions.length >= needed
      };

      if (questions.length < needed) {
        validation.isReady = false;
        validation.issues.push(`Insufficient simple questions for topic ${topic}: need ${needed}, have ${questions.length}`);
      } else if (questions.length === needed) {
        validation.warnings.push(`Exactly ${needed} simple questions for topic ${topic} - no backup questions`);
      }
    }

    // Validate complex questions (positions 16-25)
    const complexTopics = [...new Set(typeGroups.complex.map(item => item.topic))];
    for (const topic of complexTopics) {
      const questions = await getComplexQuestions(topic, language);
      const needed = typeGroups.complex.filter(item => item.topic === topic).length;
      
      validation.topicCoverage[`${topic}_complex`] = {
        needed,
        available: questions.length,
        sufficient: questions.length >= needed
      };

      if (questions.length < needed) {
        validation.isReady = false;
        validation.issues.push(`Insufficient complex questions for topic ${topic}: need ${needed}, have ${questions.length}`);
      } else if (questions.length === needed) {
        validation.warnings.push(`Exactly ${needed} complex questions for topic ${topic} - no backup questions`);
      }
    }

    // Validate context questions (positions 26-30)
    const contextGroup = await findContextWithQuestions(language);
    validation.typeCoverage.context = {
      needed: 5,
      available: contextGroup ? contextGroup.questions.length : 0,
      sufficient: contextGroup !== null,
      contextId: contextGroup ? contextGroup.context.id : null
    };

    if (!contextGroup) {
      validation.isReady = false;
      validation.issues.push('No context with 5+ questions found for context section');
    }

    // Validate matching questions (positions 31-35)
    const matchingTopics = [...new Set(typeGroups.matching.map(item => item.topic))];
    for (const topic of matchingTopics) {
      const questions = await getMatchingQuestions(topic, language);
      const needed = typeGroups.matching.filter(item => item.topic === topic).length;
      
      validation.topicCoverage[`${topic}_matching`] = {
        needed,
        available: questions.length,
        sufficient: questions.length >= needed
      };

      if (questions.length < needed) {
        validation.isReady = false;
        validation.issues.push(`Insufficient matching questions for topic ${topic}: need ${needed}, have ${questions.length}`);
      } else if (questions.length === needed) {
        validation.warnings.push(`Exactly ${needed} matching questions for topic ${topic} - no backup questions`);
      }
    }

    // Validate multiple choice questions (positions 36-40)
    const multipleTopics = [...new Set(typeGroups.multiple.map(item => item.topic))];
    for (const topic of multipleTopics) {
      const questions = await getMultipleChoiceQuestions(topic, language);
      const needed = typeGroups.multiple.filter(item => item.topic === topic).length;
      
      validation.topicCoverage[`${topic}_multiple`] = {
        needed,
        available: questions.length,
        sufficient: questions.length >= needed
      };

      if (questions.length < needed) {
        validation.isReady = false;
        validation.issues.push(`Insufficient multiple choice questions for topic ${topic}: need ${needed}, have ${questions.length}`);
      } else if (questions.length === needed) {
        validation.warnings.push(`Exactly ${needed} multiple choice questions for topic ${topic} - no backup questions`);
      }
    }

    // Calculate overall type coverage
    const typeCounts = getQuestionCountByType();
    validation.typeCoverage.simple = {
      needed: typeCounts.simple || 0,
      available: Object.values(validation.topicCoverage)
        .filter(coverage => coverage.constructor === Object && coverage.needed !== undefined)
        .filter((_, key) => Object.keys(validation.topicCoverage)[key].includes('_simple'))
        .reduce((sum, coverage) => sum + coverage.available, 0)
    };

  } catch (error) {
    validation.isReady = false;
    validation.issues.push(`Validation error: ${error.message}`);
  }

  return validation;
}

/**
 * Get recommended actions to fix exam readiness issues
 * @param {Object} validation - Validation result
 * @returns {Array} Array of recommended actions
 */
function getRecommendedActions(validation) {
  const actions = [];

  if (!validation.isReady) {
    actions.push('Database is not ready for structured 40-question exams');
    
    // Analyze issues and provide specific recommendations
    validation.issues.forEach(issue => {
      if (issue.includes('simple questions')) {
        actions.push('• Add more level 1 questions with 4 options for the mentioned topics');
      } else if (issue.includes('complex questions')) {
        actions.push('• Add more level 2 questions with 4 options for the mentioned topics');
      } else if (issue.includes('context')) {
        actions.push('• Create contexts with at least 5 related questions each');
      } else if (issue.includes('matching questions')) {
        actions.push('• Add more questions with suboptions for the mentioned topics');
      } else if (issue.includes('multiple choice')) {
        actions.push('• Add more questions with 6 options for the mentioned topics');
      }
    });
  } else {
    actions.push('✅ Database is ready for structured 40-question exams');
    
    if (validation.warnings.length > 0) {
      actions.push('Recommendations for better reliability:');
      validation.warnings.forEach(warning => {
        actions.push(`• ${warning}`);
      });
    }
  }

  return actions;
}

/**
 * Generate detailed readiness report
 * @param {string} language - Language preference
 * @returns {Promise<Object>} Detailed report
 */
async function generateReadinessReport(language = 'ru') {
  const validation = await validateStructuredExamReadiness(language);
  const actions = getRecommendedActions(validation);
  
  return {
    timestamp: new Date().toISOString(),
    language,
    isReady: validation.isReady,
    issues: validation.issues,
    warnings: validation.warnings,
    topicCoverage: validation.topicCoverage,
    typeCoverage: validation.typeCoverage,
    recommendedActions: actions,
    summary: {
      totalIssues: validation.issues.length,
      totalWarnings: validation.warnings.length,
      readinessScore: validation.isReady ? 100 : Math.max(0, 100 - (validation.issues.length * 10))
    }
  };
}

module.exports = {
  validateStructuredExamReadiness,
  getRecommendedActions,
  generateReadinessReport
};