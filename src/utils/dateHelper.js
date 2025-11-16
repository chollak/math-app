/**
 * Date utilities for API filtering and validation
 * Supports ISO 8601 date format and SQL date filtering
 */

/**
 * Validate date string format
 * Supports formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, YYYY-MM-DD HH:MM:SS
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid date format
 */
function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  // Support ISO 8601 formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, YYYY-MM-DD HH:MM:SS
  const isoRegex = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}:\d{2})?$/;
  
  if (!isoRegex.test(dateString)) {
    return false;
  }
  
  // Check if date is actually valid (not just format)
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate date field name
 * @param {string} dateField - Date field to validate
 * @returns {boolean} - True if valid date field
 */
function isValidDateField(dateField) {
  const validFields = ['started_at', 'completed_at'];
  return dateField && validFields.includes(dateField);
}

/**
 * Parse and validate date filters from request
 * @param {Object} query - Express request query object
 * @returns {Object} - Parsed date filters or validation errors
 */
function parseDateFilters(query) {
  const { startDate, endDate, dateField = 'completed_at' } = query;
  const result = {
    valid: true,
    errors: [],
    filters: {
      startDate: null,
      endDate: null,
      dateField: 'completed_at'
    }
  };
  
  // Validate dateField
  if (!isValidDateField(dateField)) {
    result.valid = false;
    result.errors.push({
      field: 'dateField',
      message: `Invalid dateField "${dateField}". Must be "started_at" or "completed_at"`
    });
  } else {
    result.filters.dateField = dateField;
  }
  
  // Validate startDate
  if (startDate) {
    if (!isValidDate(startDate)) {
      result.valid = false;
      result.errors.push({
        field: 'startDate',
        message: `Invalid startDate format "${startDate}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format`
      });
    } else {
      result.filters.startDate = startDate;
    }
  }
  
  // Validate endDate
  if (endDate) {
    if (!isValidDate(endDate)) {
      result.valid = false;
      result.errors.push({
        field: 'endDate',
        message: `Invalid endDate format "${endDate}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format`
      });
    } else {
      result.filters.endDate = endDate;
    }
  }
  
  // Validate date range (startDate should be before endDate)
  if (result.filters.startDate && result.filters.endDate) {
    const start = new Date(result.filters.startDate);
    const end = new Date(result.filters.endDate);
    
    if (start >= end) {
      result.valid = false;
      result.errors.push({
        field: 'dateRange',
        message: 'startDate must be before endDate'
      });
    }
  }
  
  return result;
}

/**
 * Build SQL WHERE conditions for date filtering
 * @param {Object} filters - Validated date filters
 * @param {Array} baseParams - Existing SQL parameters array
 * @returns {Object} - SQL condition string and updated parameters
 */
function buildDateSqlConditions(filters, baseParams = []) {
  const conditions = [];
  const params = [...baseParams];
  
  if (filters.startDate) {
    conditions.push(`${filters.dateField} >= ?`);
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    // For end date, include the entire day by adding time if not specified
    let endDateValue = filters.endDate;
    if (!endDateValue.includes('T') && !endDateValue.includes(' ')) {
      endDateValue = endDateValue + ' 23:59:59';
    }
    conditions.push(`${filters.dateField} <= ?`);
    params.push(endDateValue);
  }
  
  return {
    conditions,
    params
  };
}

/**
 * Create error response for invalid date parameters
 * @param {Array} errors - Array of validation errors
 * @returns {Object} - Error response object
 */
function createDateFilterError(errors) {
  return {
    error: 'Invalid date filter parameters',
    details: errors,
    supportedFormats: [
      'YYYY-MM-DD (e.g., 2024-01-15)',
      'YYYY-MM-DDTHH:MM:SS (e.g., 2024-01-15T14:30:00)',
      'YYYY-MM-DD HH:MM:SS (e.g., 2024-01-15 14:30:00)'
    ],
    supportedDateFields: ['started_at', 'completed_at'],
    examples: [
      'startDate=2024-01-01&endDate=2024-01-31',
      'startDate=2024-01-01&dateField=started_at',
      'endDate=2024-01-15&dateField=completed_at'
    ]
  };
}

/**
 * Format date for consistent API responses
 * @param {string|Date} date - Date to format
 * @returns {string|null} - Formatted date string or null
 */
function formatApiDate(date) {
  if (!date) return null;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    // Return in ISO format without milliseconds
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  } catch (error) {
    return null;
  }
}

module.exports = {
  isValidDate,
  isValidDateField,
  parseDateFilters,
  buildDateSqlConditions,
  createDateFilterError,
  formatApiDate
};