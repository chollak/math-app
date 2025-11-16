const database = require('../config/database');
const { buildDateSqlConditions } = require('../utils/dateHelper');

class Exam {
  /**
   * Create a new exam
   * @param {string} deviceId - Device identifier
   * @param {number} totalQuestions - Total number of questions in exam
   * @returns {Promise<number>} The ID of the created exam
   */
  static create(deviceId, totalQuestions) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO exams (device_id, total_questions, status)
        VALUES (?, ?, 'in_progress')
      `;

      database.db.run(sql, [deviceId, totalQuestions], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get exam by ID
   * @param {number} examId - Exam ID
   * @returns {Promise<object>} Exam data
   */
  static getById(examId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM exams WHERE id = ?`;

      database.db.get(sql, [examId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Complete an exam and update scores
   * @param {number} examId - Exam ID
   * @param {number} totalPoints - Total points earned
   * @param {number} maxPossiblePoints - Maximum possible points
   * @returns {Promise<void>}
   */
  static complete(examId, totalPoints, maxPossiblePoints) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE exams
        SET completed_at = CURRENT_TIMESTAMP,
            duration_seconds = (strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', started_at)),
            total_points = ?,
            max_possible_points = ?,
            status = 'completed'
        WHERE id = ?
      `;

      database.db.run(sql, [totalPoints, maxPossiblePoints, examId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get exam history for a device with optional date filtering
   * @param {string} deviceId - Device identifier
   * @param {number|null} limit - Maximum number of records to return (null = no limit)
   * @param {Object} dateFilters - Optional date filters { startDate, endDate, dateField }
   * @returns {Promise<Array>} Array of exam records
   */
  static getHistory(deviceId, limit = null, dateFilters = {}) {
    return new Promise((resolve, reject) => {
      // Build base SQL query
      let sql = `
        SELECT
          id,
          device_id,
          started_at,
          completed_at,
          duration_seconds,
          total_questions,
          total_points,
          max_possible_points,
          ROUND(total_points * 100.0 / NULLIF(max_possible_points, 0), 2) as score_percentage,
          status
        FROM exams
        WHERE device_id = ? AND status = 'completed'
      `;

      // Start with base parameters
      let params = [deviceId];

      // Add date filtering if provided
      if (dateFilters && (dateFilters.startDate || dateFilters.endDate)) {
        const dateConditions = buildDateSqlConditions(dateFilters, params);
        
        if (dateConditions.conditions.length > 0) {
          sql += ' AND ' + dateConditions.conditions.join(' AND ');
          params = dateConditions.params;
        }
      }

      // Add ordering and optional limit
      const orderField = (dateFilters && dateFilters.dateField) || 'completed_at';
      sql += ` ORDER BY ${orderField} DESC`;
      
      if (limit !== null) {
        sql += ' LIMIT ?';
        params.push(limit);
      }

      database.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get detailed exam results including all questions and answers
   * @param {number} examId - Exam ID
   * @param {string} language - Language preference ('ru' or 'kz')
   * @returns {Promise<object>} Detailed exam results
   */
  static getDetailedResults(examId, language = 'ru') {
    return new Promise((resolve, reject) => {
      // First get exam info
      const examSql = `
        SELECT
          id,
          device_id,
          started_at,
          completed_at,
          duration_seconds,
          total_questions,
          total_points,
          max_possible_points,
          ROUND(total_points * 100.0 / NULLIF(max_possible_points, 0), 2) as score_percentage,
          status
        FROM exams
        WHERE id = ?
      `;

      database.db.get(examSql, [examId], (err, exam) => {
        if (err) {
          reject(err);
          return;
        }

        if (!exam) {
          resolve(null);
          return;
        }

        // Then get all questions and answers for this exam
        const questionsSql = `
          SELECT
            eq.id,
            eq.question_id,
            eq.question_order,
            eq.user_answer,
            eq.correct_answer,
            eq.points_earned,
            eq.max_points,
            eq.answered_at,
            q.question_ru,
            q.question_kz,
            q.language,
            q.topic,
            q.level
          FROM exam_questions eq
          LEFT JOIN questions q ON eq.question_id = q.id
          WHERE eq.exam_id = ?
          ORDER BY eq.question_order ASC
        `;

        database.db.all(questionsSql, [examId], (err, questions) => {
          if (err) {
            reject(err);
          } else {
            // Transform questions to use language-specific question text
            const transformedQuestions = questions.map(q => {
              // Determine language for question display  
              const questionLanguage = language || q.language || 'ru';
              // Choose question text based on language with fallback
              const questionText = questionLanguage === 'kz' ? 
                (q.question_kz || q.question_ru) : // Fallback to Russian if Kazakh is missing
                (q.question_ru || q.question_kz);   // Fallback to Kazakh if Russian is missing
              
              return {
                id: q.id,
                question_id: q.question_id,
                question_order: q.question_order,
                user_answer: q.user_answer,
                correct_answer: q.correct_answer,
                points_earned: q.points_earned,
                max_points: q.max_points,
                answered_at: q.answered_at,
                question: questionText,
                language: questionLanguage,
                topic: q.topic,
                level: q.level
              };
            });
            
            resolve({
              exam,
              questions: transformedQuestions
            });
          }
        });
      });
    });
  }

  /**
   * Get statistics for a device
   * @param {string} deviceId - Device identifier
   * @returns {Promise<object>} Statistics data
   */
  static getStats(deviceId) {
    return new Promise((resolve, reject) => {
      const statsSql = `
        SELECT
          COUNT(*) as total_exams,
          AVG(total_points * 100.0 / NULLIF(max_possible_points, 0)) as average_score,
          MAX(total_points * 100.0 / NULLIF(max_possible_points, 0)) as best_score,
          MIN(total_points * 100.0 / NULLIF(max_possible_points, 0)) as worst_score,
          SUM(total_questions) as total_questions_answered
        FROM exams
        WHERE device_id = ? AND status = 'completed'
      `;

      database.db.get(statsSql, [deviceId], (err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        // Get improvement trend (last 10 exams)
        const trendSql = `
          SELECT
            ROUND(total_points * 100.0 / NULLIF(max_possible_points, 0), 2) as score
          FROM exams
          WHERE device_id = ? AND status = 'completed'
          ORDER BY completed_at ASC
          LIMIT 10
        `;

        database.db.all(trendSql, [deviceId], (err, trend) => {
          if (err) {
            reject(err);
            return;
          }

          // Get stats by topic
          const topicSql = `
            SELECT
              q.topic,
              COUNT(DISTINCT eq.exam_id) as exams_count,
              AVG(eq.points_earned * 100.0 / NULLIF(eq.max_points, 0)) as avg_score,
              COUNT(*) as questions_answered
            FROM exam_questions eq
            LEFT JOIN questions q ON eq.question_id = q.id
            LEFT JOIN exams e ON eq.exam_id = e.id
            WHERE e.device_id = ? AND e.status = 'completed' AND q.topic IS NOT NULL
            GROUP BY q.topic
            ORDER BY exams_count DESC
          `;

          database.db.all(topicSql, [deviceId], (err, byTopic) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                total_exams: stats.total_exams || 0,
                average_score: stats.average_score ? parseFloat(stats.average_score.toFixed(2)) : 0,
                best_score: stats.best_score ? parseFloat(stats.best_score.toFixed(2)) : 0,
                worst_score: stats.worst_score ? parseFloat(stats.worst_score.toFixed(2)) : 0,
                total_questions_answered: stats.total_questions_answered || 0,
                improvement_trend: (trend || []).map(t => t.score),
                by_topic: byTopic || []
              });
            }
          });
        });
      });
    });
  }

  /**
   * Delete exam (for testing purposes)
   * @param {number} examId - Exam ID
   * @returns {Promise<void>}
   */
  static delete(examId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM exams WHERE id = ?`;

      database.db.run(sql, [examId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Exam;
