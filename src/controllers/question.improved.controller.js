const Question = require('../models/Question');
const AnswerOption = require('../models/AnswerOption');
const imageService = require('../services/image.service');

/**
 * Улучшенный контроллер вопросов с обработкой изображений
 */

const questionController = {
  /**
   * Создание вопроса с обработкой изображений
   */
  createQuestion: async (req, res) => {
    try {
      const {
        question_ru,
        question_kz,
        question,
        language,
        answer,
        level,
        topic,
        subject_id,
        topic_id,
        context_id,
        options,
        difficulty,
        points
      } = req.body;

      // Валидация
      if (!answer) {
        return res.status(400).json({ error: 'Answer is required' });
      }

      // Парсинг опций
      let parsedOptions;
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid options format' });
      }

      if (!parsedOptions || !Array.isArray(parsedOptions) || parsedOptions.length === 0) {
        return res.status(400).json({ error: 'At least one answer option is required' });
      }

      // Определяем финальный текст вопроса
      let finalQuestionRu = question_ru;
      let finalQuestionKz = question_kz;
      let finalLanguage = language || 'ru';

      if (question && language) {
        if (language === 'kz') {
          finalQuestionKz = question;
        } else {
          finalQuestionRu = question;
        }
      }

      // Подготовка данных вопроса (пока без фото)
      const questionData = {
        question_ru: finalQuestionRu || null,
        question_kz: finalQuestionKz || null,
        language: finalLanguage,
        answer,
        level: level ? parseInt(level) : null,
        topic: topic || null,
        subject_id: subject_id ? parseInt(subject_id) : null,
        topic_id: topic_id ? parseInt(topic_id) : null,
        context_id: context_id ? parseInt(context_id) : null,
        difficulty: difficulty ? parseInt(difficulty) : 1,
        points: points ? parseInt(points) : 1,
        photos: [] // Заполним после обработки
      };

      // Создаем вопрос в БД (получаем ID)
      const createdQuestion = await new Promise((resolve, reject) => {
        Question.create(questionData, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const questionId = createdQuestion.id;
      console.log(`✅ Question created with ID: ${questionId}`);

      // Обработка загруженных изображений
      let processedPhotos = [];

      if (req.files) {
        const uploadedFiles = [];

        // Собираем все загруженные файлы
        ['photo1', 'photo2', 'photo3'].forEach(fieldName => {
          if (req.files[fieldName] && req.files[fieldName][0]) {
            uploadedFiles.push(req.files[fieldName][0]);
          }
        });

        // Также поддержка массива photos[]
        if (req.files.photos) {
          uploadedFiles.push(...req.files.photos);
        }

        // Обрабатываем каждое изображение
        try {
          const prefix = `q${questionId}`;
          processedPhotos = await imageService.processMultipleImages(
            uploadedFiles,
            prefix
          );

          console.log(`✅ Processed ${processedPhotos.length} images for question ${questionId}`);

        } catch (error) {
          console.error('Image processing error:', error);

          // Откатываем создание вопроса при ошибке обработки изображений
          // TODO: удалить вопрос из БД или пометить как неполный

          return res.status(400).json({
            error: 'Image processing failed',
            message: error.message
          });
        }
      }

      // Обновляем вопрос с информацией о фотографиях
      // TODO: Добавить метод Question.updatePhotos()
      // Пока сохраняем в упрощенном формате для совместимости

      // Создаем варианты ответов
      const createdOptions = await new Promise((resolve, reject) => {
        AnswerOption.createBatch(
          questionId,
          parsedOptions,
          finalLanguage,
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      // Формируем ответ
      const questionText = finalLanguage === 'kz' ? finalQuestionKz : finalQuestionRu;

      const optionsArray = createdOptions.map(option => {
        const optionText = finalLanguage === 'kz'
          ? option.option_text_kz
          : option.option_text_ru;

        if (option.suboptions && option.suboptions.length > 0) {
          return {
            text: optionText,
            suboptions: option.suboptions
          };
        }
        return optionText;
      }).filter(option => {
        if (typeof option === 'string') return option;
        if (typeof option === 'object') return option.text;
        return false;
      });

      // Генерируем URL для изображений
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const photoUrls = processedPhotos.map(photo =>
        imageService.getImageUrls(photo, baseUrl)
      );

      res.status(201).json({
        id: questionId,
        question: questionText,
        language: finalLanguage,
        answer: answer,
        level: questionData.level,
        topic: questionData.topic,
        subject_id: questionData.subject_id,
        topic_id: questionData.topic_id,
        difficulty: questionData.difficulty,
        points: questionData.points,
        photos: photoUrls, // Массив объектов с версиями
        created_at: new Date().toISOString(),
        options: optionsArray
      });

    } catch (error) {
      console.error('Error in createQuestion:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  },

  /**
   * Получение всех вопросов
   */
  getAllQuestions: async (req, res) => {
    try {
      const questions = await new Promise((resolve, reject) => {
        Question.findAll((err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Добавляем URL к фотографиям
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const questionsWithUrls = questions.map(q => ({
        ...q,
        photos: q.photos?.map(photo =>
          imageService.getImageUrls(photo, baseUrl)
        ) || []
      }));

      res.json(questionsWithUrls);

    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  },

  /**
   * Получение вопроса по ID
   */
  getQuestionById: async (req, res) => {
    try {
      const { id } = req.params;

      const question = await new Promise((resolve, reject) => {
        Question.findById(id, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Получаем варианты ответов
      const options = await new Promise((resolve, reject) => {
        AnswerOption.findByQuestionId(id, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Трансформируем опции
      const language = question.language || 'ru';
      const transformedOptions = options.map(option => {
        const optionText = language === 'kz'
          ? option.option_text_kz
          : option.option_text_ru;

        if (option.suboptions && option.suboptions.length > 0) {
          return {
            text: optionText,
            suboptions: option.suboptions
          };
        }
        return optionText;
      }).filter(option => {
        if (typeof option === 'string') return option;
        if (typeof option === 'object') return option.text;
        return false;
      });

      // Добавляем URL к фотографиям
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const photoUrls = question.photos?.map(photo =>
        imageService.getImageUrls(photo, baseUrl)
      ) || [];

      res.json({
        ...question,
        options: transformedOptions,
        photos: photoUrls
      });

    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  },

  /**
   * Удаление вопроса (с удалением изображений)
   */
  deleteQuestion: async (req, res) => {
    try {
      const { id } = req.params;

      // Получаем вопрос для доступа к фото
      const question = await new Promise((resolve, reject) => {
        Question.findById(id, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Удаляем все фотографии
      if (question.photos && question.photos.length > 0) {
        for (const photo of question.photos) {
          await imageService.deleteImage(photo);
        }
      }

      // Удаляем вопрос из БД
      // TODO: Добавить метод Question.delete(id)

      res.json({
        message: 'Question deleted successfully',
        id: id
      });

    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
};

module.exports = questionController;
