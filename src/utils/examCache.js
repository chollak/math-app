/**
 * Simple in-memory cache for exam question selection
 * Caches question pools to avoid repeated database queries
 */

class ExamCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate cache key
   * @param {string} type - Question type (simple, complex, matching, etc.)
   * @param {string} topic - Topic name
   * @param {string} language - Language
   * @returns {string} Cache key
   */
  _generateKey(type, topic, language) {
    return `${type}_${topic}_${language}`;
  }

  /**
   * Set cache entry
   * @param {string} type - Question type
   * @param {string} topic - Topic name  
   * @param {string} language - Language
   * @param {Array} data - Questions array
   */
  set(type, topic, language, data) {
    const key = this._generateKey(type, topic, language);
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache entry if valid
   * @param {string} type - Question type
   * @param {string} topic - Topic name
   * @param {string} language - Language
   * @returns {Array|null} Cached questions or null if expired/missing
   */
  get(type, topic, language) {
    const key = this._generateKey(type, topic, language);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      ttlMs: this.ttl
    };
  }
}

// Create singleton cache instance
const examCache = new ExamCache();

// Auto cleanup every 10 minutes
setInterval(() => {
  examCache.cleanup();
}, 10 * 60 * 1000);

module.exports = examCache;