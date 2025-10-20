const Question = require('../models/Question');
const AnswerOption = require('../models/AnswerOption');

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

          res.status(201).json({
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
          });
        });
      });

    } catch (error) {
      console.error('Error in createQuestion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all questions with their options
  getAllQuestions: (req, res) => {
    Question.findAll((err, questions) => {
      if (err) {
        console.error('Error fetching questions:', err);
        return res.status(500).json({ error: 'Failed to fetch questions' });
      }

      res.json(questions);
    });
  },

  // Get single question by ID
  getQuestionById: (req, res) => {
    const { id } = req.params;

    Question.findById(id, (err, question) => {
      if (err) {
        console.error('Error fetching question:', err);
        return res.status(500).json({ error: 'Failed to fetch question' });
      }

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Get answer options for this question
      AnswerOption.findByQuestionId(id, (err, options) => {
        if (err) {
          console.error('Error fetching answer options:', err);
          return res.status(500).json({ error: 'Failed to fetch answer options' });
        }

        // Transform options to match the format from Question.findAll
        const language = question.language || 'ru';
        const transformedOptions = options.map(option => {
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
          if (typeof option === 'string') {
            return option;
          } else if (typeof option === 'object') {
            return option.text;
          }
          return false;
        });

        res.json({
          ...question,
          options: transformedOptions
        });
      });
    });
  }
};

module.exports = questionController;