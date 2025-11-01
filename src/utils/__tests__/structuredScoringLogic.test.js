/**
 * Tests for structured scoring logic
 */

const {
  calculateSimpleQuestionPoints,
  calculateMatchingQuestionPoints,
  calculateMultipleChoicePoints,
  calculateStructuredPoints,
  getQuestionTypeByPosition,
  parseMatchingAnswers
} = require('../structuredScoringLogic');

describe('Structured Scoring Logic', () => {

  describe('parseMatchingAnswers', () => {
    test('should parse matching answers correctly', () => {
      expect(parseMatchingAnswers('A1B2')).toEqual(['A1', 'B2']);
      expect(parseMatchingAnswers('A1B2C3')).toEqual(['A1', 'B2', 'C3']);
      expect(parseMatchingAnswers('a1b2')).toEqual(['A1', 'B2']);
      expect(parseMatchingAnswers('')).toEqual([]);
      expect(parseMatchingAnswers('A1')).toEqual(['A1']);
    });
  });

  describe('getQuestionTypeByPosition', () => {
    test('should identify question types correctly', () => {
      expect(getQuestionTypeByPosition(1)).toBe('simple');
      expect(getQuestionTypeByPosition(15)).toBe('simple');
      expect(getQuestionTypeByPosition(16)).toBe('simple');
      expect(getQuestionTypeByPosition(25)).toBe('simple');
      expect(getQuestionTypeByPosition(26)).toBe('simple');
      expect(getQuestionTypeByPosition(30)).toBe('simple');
      expect(getQuestionTypeByPosition(31)).toBe('matching');
      expect(getQuestionTypeByPosition(35)).toBe('matching');
      expect(getQuestionTypeByPosition(36)).toBe('multiple');
      expect(getQuestionTypeByPosition(40)).toBe('multiple');
    });
  });

  describe('Simple Questions (1-30)', () => {
    test('should score correct single answer', () => {
      const result = calculateSimpleQuestionPoints('A', 'A');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 1 });
    });

    test('should score incorrect single answer', () => {
      const result = calculateSimpleQuestionPoints('A', 'B');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 1 });
    });

    test('should score empty answer', () => {
      const result = calculateSimpleQuestionPoints('A', '');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 1 });
    });
  });

  describe('Matching Questions (31-35)', () => {
    test('should score 2 из 2 = 2 points', () => {
      const result = calculateMatchingQuestionPoints('A1B2', 'A1B2');
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should score 1 из 2 = 1 point', () => {
      const result = calculateMatchingQuestionPoints('A1B2', 'A1B3');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    test('should score 0 из 2 = 0 points', () => {
      const result = calculateMatchingQuestionPoints('A1B2', 'A3B4');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    test('should score 1 из 1 = 1 point', () => {
      const result = calculateMatchingQuestionPoints('A1', 'A1');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    test('should score empty matching answer', () => {
      const result = calculateMatchingQuestionPoints('A1B2', '');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });
  });

  describe('Multiple Choice Questions (36-40)', () => {
    // Test cases for 1 correct answer
    test('should score 1 из 1 = 2 points', () => {
      const result = calculateMultipleChoicePoints('A', 'A');
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should score 0 из 1 = 0 points', () => {
      const result = calculateMultipleChoicePoints('A', 'B');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    test('should score 2 из 1 = 1 point', () => {
      const result = calculateMultipleChoicePoints('A', 'A,B');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    test('should score 3 из 1 = 0 points', () => {
      const result = calculateMultipleChoicePoints('A', 'A,B,C');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    // Test cases for 2 correct answers
    test('should score 2 из 2 = 2 points', () => {
      const result = calculateMultipleChoicePoints('A,B', 'A,B');
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should score 1 из 2 = 1 point', () => {
      const result = calculateMultipleChoicePoints('A,B', 'A,C');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    test('should score 0 из 2 = 0 points', () => {
      const result = calculateMultipleChoicePoints('A,B', 'C,D');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    test('should score 3 из 2 = 1 point', () => {
      const result = calculateMultipleChoicePoints('A,B', 'A,B,C');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    // Test cases for 3 correct answers
    test('should score 3 из 3 = 2 points', () => {
      const result = calculateMultipleChoicePoints('A,B,C', 'A,B,C');
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should score 2 из 3 = 1 point', () => {
      const result = calculateMultipleChoicePoints('A,B,C', 'A,B,D');
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 2 });
    });

    test('should score 1 из 3 = 0 points', () => {
      const result = calculateMultipleChoicePoints('A,B,C', 'A,D,E');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    test('should score 0 из 3 = 0 points', () => {
      const result = calculateMultipleChoicePoints('A,B,C', 'D,E,F');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });

    test('should score empty multiple choice answer', () => {
      const result = calculateMultipleChoicePoints('A,B,C', '');
      expect(result).toEqual({ pointsEarned: 0, maxPoints: 2 });
    });
  });

  describe('Structured Points Calculation', () => {
    test('should use simple scoring for positions 1-30 in structured exam', () => {
      const result = calculateStructuredPoints('A', 'A', 15, true);
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 1 });
    });

    test('should use matching scoring for positions 31-35 in structured exam', () => {
      const result = calculateStructuredPoints('A1B2', 'A1B2', 33, true);
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should use multiple choice scoring for positions 36-40 in structured exam', () => {
      const result = calculateStructuredPoints('A,B', 'A,B', 38, true);
      expect(result).toEqual({ pointsEarned: 2, maxPoints: 2 });
    });

    test('should use simple scoring for non-structured exams', () => {
      const result = calculateStructuredPoints('A', 'A', 38, false);
      expect(result).toEqual({ pointsEarned: 1, maxPoints: 1 });
    });
  });
});