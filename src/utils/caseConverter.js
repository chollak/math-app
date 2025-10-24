/**
 * Utility functions for converting between camelCase and snake_case
 * Used to convert API responses to camelCase for iOS app
 * and convert incoming camelCase requests to snake_case for database
 */

/**
 * Convert snake_case string to camelCase
 * @param {string} str - String in snake_case
 * @returns {string} String in camelCase
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 * @param {string} str - String in camelCase
 * @returns {string} String in snake_case
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert object keys from snake_case to camelCase
 * @param {*} obj - Object, array, or primitive value
 * @returns {*} Converted value
 */
function keysToCamel(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item));
  }

  // Handle objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {});
  }

  // Return primitives as-is
  return obj;
}

/**
 * Recursively convert object keys from camelCase to snake_case
 * @param {*} obj - Object, array, or primitive value
 * @returns {*} Converted value
 */
function keysToSnake(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item));
  }

  // Handle objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {});
  }

  // Return primitives as-is
  return obj;
}

module.exports = {
  snakeToCamel,
  camelToSnake,
  keysToCamel,
  keysToSnake
};
