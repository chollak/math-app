const database = require('../config/database');

class ExamQuestion {
  /**
   * Create exam questions in batch
   * @param {number} examId - Exam ID
   * @param {Array} questions - Array of {questionId, order, correctAnswer, maxPoints}
   * @returns {Promise<void>}
   */
  static createBatch(examId, questions) {
    return new Promise((resolve, reject) => {
      if (!questions || questions.length === 0) {
        resolve();
        return;
      }

      const sql = `
        INSERT INTO exam_questions (exam_id, question_id, question_order, correct_answer, max_points)
        VALUES (?, ?, ?, ?, ?)
      `;

      const stmt = database.db.prepare(sql);
      let completed = 0;
      let hasError = false;

      questions.forEach(q => {
        stmt.run([examId, q.questionId, q.order, q.correctAnswer, q.maxPoints], (err) => {
          if (err && !hasError) {
            hasError = true;
            stmt.finalize();
            reject(err);
            return;
          }

          completed++;
          if (completed === questions.length) {
            stmt.finalize((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }
        });
      });
    });
  }

  /**
   * Update answer and points for a question
   * @param {number} examId - Exam ID
   * @param {number} questionId - Question ID
   * @param {string} userAnswer - User's answer
   * @param {number} pointsEarned - Points earned
   * @returns {Promise<void>}
   */
  static updateAnswer(examId, questionId, userAnswer, pointsEarned) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE exam_questions
        SET user_answer = ?,
            points_earned = ?,
            answered_at = CURRENT_TIMESTAMP
        WHERE exam_id = ? AND question_id = ?
      `;

      database.db.run(sql, [userAnswer, pointsEarned, examId, questionId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Update multiple answers in batch (for submit endpoint)
   * @param {number} examId - Exam ID
   * @param {Array} answers - Array of {questionId, userAnswer, pointsEarned}
   * @returns {Promise<void>}
   */
  static updateAnswersBatch(examId, answers) {
    return new Promise((resolve, reject) => {
      if (!answers || answers.length === 0) {
        resolve();
        return;
      }

      const sql = `
        UPDATE exam_questions
        SET user_answer = ?,
            points_earned = ?,
            answered_at = CURRENT_TIMESTAMP
        WHERE exam_id = ? AND question_id = ?
      `;

      const stmt = database.db.prepare(sql);
      let completed = 0;
      let hasError = false;

      answers.forEach(a => {
        stmt.run([a.userAnswer, a.pointsEarned, examId, a.questionId], (err) => {
          if (err && !hasError) {
            hasError = true;
            stmt.finalize();
            reject(err);
            return;
          }

          completed++;
          if (completed === answers.length) {
            stmt.finalize((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }
        });
      });
    });
  }

  /**
   * Get all questions for an exam
   * @param {number} examId - Exam ID
   * @returns {Promise<Array>} Array of exam questions
   */
  static getByExamId(examId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          eq.id,
          eq.exam_id,
          eq.question_id,
          eq.question_order,
          eq.user_answer,
          eq.correct_answer,
          eq.points_earned,
          eq.max_points,
          eq.answered_at
        FROM exam_questions eq
        WHERE eq.exam_id = ?
        ORDER BY eq.question_order ASC
      `;

      database.db.all(sql, [examId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get exam question with full question data
   * @param {number} examId - Exam ID
   * @param {number} questionId - Question ID
   * @returns {Promise<object>} Exam question with full question details
   */
  static getWithQuestionData(examId, questionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          eq.*,
          q.question_ru,
          q.question_kz,
          q.language,
          q.topic,
          q.level,
          q.photos,
          q.context_id
        FROM exam_questions eq
        LEFT JOIN questions q ON eq.question_id = q.id
        WHERE eq.exam_id = ? AND eq.question_id = ?
      `;

      database.db.get(sql, [examId, questionId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get all questions for an exam with full question data
   * @param {number} examId - Exam ID
   * @returns {Promise<Array>} Array of exam questions with question details
   */
  static getAllWithQuestionData(examId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          eq.id as exam_question_id,
          eq.exam_id,
          eq.question_id,
          eq.question_order,
          eq.correct_answer,
          eq.max_points,
          q.question_ru,
          q.question_kz,
          q.language,
          q.topic,
          q.level,
          q.photos,
          q.context_id
        FROM exam_questions eq
        LEFT JOIN questions q ON eq.question_id = q.id
        WHERE eq.exam_id = ?
        ORDER BY eq.question_order ASC
      `;

      database.db.all(sql, [examId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Calculate total points for an exam
   * @param {number} examId - Exam ID
   * @returns {Promise<object>} {totalPoints, maxPossiblePoints}
   */
  static calculateTotalPoints(examId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COALESCE(SUM(points_earned), 0) as total_points,
          COALESCE(SUM(max_points), 0) as max_possible_points
        FROM exam_questions
        WHERE exam_id = ?
      `;

      database.db.get(sql, [examId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalPoints: row.total_points || 0,
            maxPossiblePoints: row.max_possible_points || 0
          });
        }
      });
    });
  }
}

module.exports = ExamQuestion;
