const Question = require('../models/Question');
const AnswerOption = require('../models/AnswerOption');
const database = require('../config/database');
const { getValidatedLanguage, createLanguageError } = require('../utils/languageHelper');
const { keysToCamel } = require('../utils/caseConverter');

const questionController = {
  // Create a new question with options and photos
  createQuestion: (req, res) => {
    try {
      const {
        // Support both old and new format
        question_ru,
        question_kz,
        question,
        language,
        answer,
        level,
        context,
        context_title,
        topic,
        options
      } = req.body;

      // Parse options if it's a JSON string
      let parsedOptions;
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid options format' });
      }

      // Determine question text and language
      let finalQuestionRu = question_ru;
      let finalQuestionKz = question_kz;
      let finalLanguage = language || 'ru';

      // Support new format: question + language
      if (question && language) {
        if (language === 'kz') {
          finalQuestionKz = question;
        } else {
          finalQuestionRu = question;
        }
      }

      // Validate required fields
      if (!finalQuestionRu && !finalQuestionKz && !question) {
        return res.status(400).json({ error: 'Question text is required' });
      }

      // Validate language field
      if (language && !['ru', 'kz'].includes(language)) {
        return res.status(400).json({ error: 'Language must be "ru" or "kz"' });
      }

      if (!answer) {
        return res.status(400).json({ error: 'Answer is required' });
      }

      if (!parsedOptions || !Array.isArray(parsedOptions) || parsedOptions.length === 0) {
        return res.status(400).json({ error: 'At least one answer option is required' });
      }

      if (parsedOptions.length > 13) {
        return res.status(400).json({ error: 'Maximum 13 answer options allowed' });
      }

      // Handle uploaded photos - new photos array format
      const photos = [];
      if (req.files) {
        ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            photos.push(req.files[fieldName][0].filename);
          }
        });
        
        // Also support generic photos[] field
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            photos.push(file.filename);
          });
        }
      }

      // Parse context_id if provided
      const context_id = req.body.context_id ? parseInt(req.body.context_id) : null;

      // Prepare question data
      const questionData = {
        question_ru: finalQuestionRu || null,
        question_kz: finalQuestionKz || null,
        language: finalLanguage,
        answer,
        level: level ? parseInt(level) : null,
        topic: topic || null,
        photos,
        context_id
      };

      // Create question
      Question.create(questionData, (err, createdQuestion) => {
        if (err) {
          console.error('Error creating question:', err);
          return res.status(500).json({ error: 'Failed to create question' });
        }

        // Create answer options
        const language = createdQuestion.language || 'ru';
        AnswerOption.createBatch(createdQuestion.id, parsedOptions, language, (err, createdOptions) => {
          if (err) {
            console.error('Error creating answer options:', err);
            return res.status(500).json({ error: 'Failed to create answer options' });
          }

          // Transform response to new format
          const language = createdQuestion.language || 'ru';
          const questionText = language === 'kz' ? createdQuestion.question_kz : createdQuestion.question_ru;
          
          // Transform options to new format, handling suboptions
          const optionsArray = createdOptions.map(option => {
            const optionText = language === 'kz' ? option.option_text_kz : option.option_text_ru;
            
            if (option.suboptions && option.suboptions.length > 0) {
              return {
                text: optionText,
                suboptions: option.suboptions
              };
            } else {
              return optionText;
            }
          }).filter(option => {
            // Filter out null/undefined values
            if (typeof option === 'string') {
              return option;
            } else if (typeof option === 'object') {
              return option.text;
            }
            return false;
          });

          const response = {
            id: createdQuestion.id,
            question: questionText,
            language: language,
            answer: createdQuestion.answer,
            level: createdQuestion.level,
            topic: createdQuestion.topic,
            photos: createdQuestion.photos || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            options: optionsArray,
            context: null // Will be loaded separately if context_id exists
          };

          res.status(201).json(keysToCamel(response));
        });
      });

    } catch (error) {
      console.error('Error in createQuestion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all questions with their options
  getAllQuestions: (req, res) => {
    // Get language from query parameters (priority) or headers  
    const language = getValidatedLanguage(req);
    
    // Check for invalid language that was explicitly provided
    const rawLanguage = req.headers['accept-language'] || 
                       req.headers['x-app-language'] || 
                       req.query.language;
    
    if (rawLanguage && !language) {
      return res.status(400).json(createLanguageError(rawLanguage));
    }

    Question.findAll(language, (err, questions) => {
      if (err) {
        console.error('Error fetching questions:', err);
        return res.status(500).json({ error: 'Failed to fetch questions' });
      }

      // Transform questions to return only relevant language data
      const transformedQuestions = questions.map(question => {
        const transformed = {
          id: question.id,
          question: question.question, // Add question text first to match single question format
          answer: question.answer,
          level: question.level,
          topic: question.topic,
          language: question.language,
          created_at: question.created_at,
          updated_at: question.updated_at,
          context_id: question.context_id,
          context_text: question.context_text,
          context_title: question.context_title,
          context_photos: question.context_photos,
          photos: question.photos,
          options: question.options
        };

        return transformed;
      });

      res.json(keysToCamel(transformedQuestions));
    });
  },

  // Get single question by ID
  getQuestionById: (req, res) => {
    const { id } = req.params;
    
    // Get language from query parameters (priority) or headers  
    const language = getValidatedLanguage(req);
    
    // Check for invalid language that was explicitly provided
    const rawLanguage = req.headers['accept-language'] || 
                       req.headers['x-app-language'] || 
                       req.query.language;
    
    if (rawLanguage && !language) {
      return res.status(400).json(createLanguageError(rawLanguage));
    }

    Question.findById(id, language, (err, question) => {
      if (err) {
        console.error('Error fetching question:', err);
        return res.status(500).json({ error: 'Failed to fetch question' });
      }

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Transform question to match getAllQuestions format
      const transformed = {
        id: question.id,
        question: question.question, // Already language-specific from findById
        answer: question.answer,
        level: question.level,
        topic: question.topic,
        language: question.language,
        created_at: question.created_at,
        updated_at: question.updated_at,
        context_id: question.context_id,
        context_text: question.context_text,
        context_title: question.context_title,
        context_photos: question.context_photos,
        photos: question.photos,
        options: question.options
      };

      res.json(keysToCamel(transformed));
    });
  },

  // Update question by ID
  updateQuestion: (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid question ID is required' });
      }

      const {
        question_ru,
        question_kz,
        question,
        language,
        answer,
        level,
        context,
        context_title,
        topic,
        options
      } = req.body;

      // Parse options if it's a JSON string
      let parsedOptions;
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid options format' });
      }

      // Determine question text and language
      let finalQuestionRu = question_ru;
      let finalQuestionKz = question_kz;
      let finalLanguage = language || 'ru';

      // Support new format: question + language
      if (question && language) {
        if (language === 'kz') {
          finalQuestionKz = question;
        } else {
          finalQuestionRu = question;
        }
      }

      // Validate language field
      if (language && !['ru', 'kz'].includes(language)) {
        return res.status(400).json({ error: 'Language must be "ru" or "kz"' });
      }

      // Handle uploaded photos
      const photos = [];
      if (req.files) {
        ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            photos.push(req.files[fieldName][0].filename);
          }
        });
        
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            photos.push(file.filename);
          });
        }
      }

      // Parse context_id if provided
      const context_id = req.body.context_id ? parseInt(req.body.context_id) : null;

      // Prepare question data
      const questionData = {
        question_ru: finalQuestionRu || null,
        question_kz: finalQuestionKz || null,
        language: finalLanguage,
        answer,
        level: level ? parseInt(level) : null,
        topic: topic || null,
        photos: photos.length > 0 ? photos : undefined, // Keep existing photos if no new ones
        context_id
      };

      // Update question
      Question.update(parseInt(id), questionData, (err, updatedQuestion) => {
        if (err) {
          console.error('Error updating question:', err);
          if (err.message === 'Question not found') {
            return res.status(404).json({ error: 'Question not found' });
          }
          return res.status(500).json({ error: 'Failed to update question' });
        }

        // Update answer options if provided
        if (parsedOptions && Array.isArray(parsedOptions) && parsedOptions.length > 0) {
          if (parsedOptions.length > 13) {
            return res.status(400).json({ error: 'Maximum 13 answer options allowed' });
          }

          // Delete existing options first
          const deleteOptionsSql = 'DELETE FROM answer_options WHERE question_id = ?';
          database.db.run(deleteOptionsSql, [parseInt(id)], (err) => {
            if (err) {
              console.error('Error deleting old options:', err);
              return res.status(500).json({ error: 'Failed to update answer options' });
            }

            // Create new options
            const language = updatedQuestion.language || 'ru';
            AnswerOption.createBatch(parseInt(id), parsedOptions, language, (err, createdOptions) => {
              if (err) {
                console.error('Error creating new options:', err);
                return res.status(500).json({ error: 'Failed to create new answer options' });
              }

              // Return updated question with options
              res.json(keysToCamel({
                ...updatedQuestion,
                message: 'Question updated successfully'
              }));
            });
          });
        } else {
          // No options to update, return question
          res.json(keysToCamel({
            ...updatedQuestion,
            message: 'Question updated successfully'
          }));
        }
      });

    } catch (error) {
      console.error('Error in updateQuestion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete question by ID
  deleteQuestion: (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Valid question ID is required' });
      }

      Question.delete(parseInt(id), (err, result) => {
        if (err) {
          console.error('Error deleting question:', err);
          if (err.message === 'Question not found') {
            return res.status(404).json({ error: 'Question not found' });
          }
          return res.status(500).json({ error: 'Failed to delete question' });
        }

        res.json(keysToCamel(result));
      });

    } catch (error) {
      console.error('Error in deleteQuestion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = questionController;