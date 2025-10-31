/**
 * Language detection utilities for API requests
 * Supports multiple sources: headers, query params, and request body
 */

/**
 * Extract language from request with priority order:
 * 1. Accept-Language header (HTTP standard)
 * 2. X-App-Language header (custom)
 * 3. query.language parameter (backward compatibility)
 * 4. filters.language in request body (for exams)
 * 
 * @param {Object} req - Express request object
 * @param {Object} filters - Optional filters object (for exams)
 * @returns {string|null} - Language code ('ru', 'kz') or null
 */
function getLanguageFromRequest(req, filters = {}) {
  // Priority 1: Accept-Language header (HTTP standard)
  let language = req.headers['accept-language'];
  
  // Priority 2: X-App-Language header (custom for mobile apps)
  if (!language) {
    language = req.headers['x-app-language'];
  }
  
  // Priority 3: Query parameter (backward compatibility)
  if (!language) {
    language = req.query.language;
  }
  
  // Priority 4: Filters object (for exams)
  if (!language && filters.language) {
    language = filters.language;
  }
  
  // Clean up language code (handle cases like "ru-RU" -> "ru")
  if (language) {
    language = language.toLowerCase().split('-')[0];
  }
  
  return language;
}

/**
 * Validate language code
 * @param {string} language - Language code to validate
 * @returns {boolean} - True if valid language
 */
function isValidLanguage(language) {
  const validLanguages = ['ru', 'kz'];
  return language && validLanguages.includes(language.toLowerCase());
}

/**
 * Get validated language from request or return null
 * @param {Object} req - Express request object
 * @param {Object} filters - Optional filters object
 * @returns {string|null} - Valid language code or null
 */
function getValidatedLanguage(req, filters = {}) {
  const language = getLanguageFromRequest(req, filters);
  return isValidLanguage(language) ? language.toLowerCase() : null;
}

/**
 * Create error response for invalid language
 * @param {string} language - Invalid language that was provided
 * @returns {Object} - Error response object
 */
function createLanguageError(language) {
  return {
    error: 'Invalid language parameter',
    message: `Language "${language}" is not supported. Must be "ru" or "kz"`,
    validLanguages: ['ru', 'kz'],
    receivedFrom: 'header or query parameter'
  };
}

module.exports = {
  getLanguageFromRequest,
  isValidLanguage, 
  getValidatedLanguage,
  createLanguageError
};