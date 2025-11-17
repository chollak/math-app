/**
 * Утилиты для качественной рандомизации
 * Включает алгоритмы Fisher-Yates shuffle, weighted random selection
 */

/**
 * Fisher-Yates shuffle - качественный алгоритм перемешивания массива
 * Обеспечивает равномерное распределение, в отличие от sort(() => Math.random() - 0.5)
 * @param {Array} array - Массив для перемешивания (изменяется на месте)
 * @returns {Array} Перемешанный массив
 */
function fisherYatesShuffle(array) {
  // Создаем копию массива, чтобы не изменять оригинал
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Выбираем случайный индекс от 0 до i
    const j = Math.floor(Math.random() * (i + 1));
    
    // Меняем местами элементы
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Выбрать случайный элемент из массива
 * @param {Array} array - Массив для выбора
 * @returns {*} Случайный элемент или null если массив пустой
 */
function randomChoice(array) {
  if (!array || array.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

/**
 * Выбрать несколько уникальных случайных элементов из массива
 * @param {Array} array - Исходный массив
 * @param {number} count - Количество элементов для выбора
 * @returns {Array} Массив уникальных случайных элементов
 */
function randomSample(array, count) {
  if (!array || array.length === 0) {
    return [];
  }
  
  // Если запрашиваем больше элементов чем есть, возвращаем все
  if (count >= array.length) {
    return fisherYatesShuffle(array);
  }
  
  // Перемешиваем массив и берем первые count элементов
  const shuffled = fisherYatesShuffle(array);
  return shuffled.slice(0, count);
}

/**
 * Weighted random selection - выбор с учетом весов
 * @param {Array} items - Массив элементов
 * @param {Array} weights - Массив весов (должен быть той же длины что и items)
 * @returns {*} Выбранный элемент или null
 */
function weightedRandomChoice(items, weights) {
  if (!items || !weights || items.length !== weights.length || items.length === 0) {
    return null;
  }
  
  // Вычисляем общую сумму весов
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  if (totalWeight <= 0) {
    return null;
  }
  
  // Генерируем случайное число от 0 до totalWeight
  let random = Math.random() * totalWeight;
  
  // Находим элемент, на который попало случайное число
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  // Fallback (не должно произойти при корректных данных)
  return items[items.length - 1];
}

/**
 * Генератор случайных чисел с сидом (для воспроизводимости тестов)
 * Использует Linear Congruential Generator (LCG)
 */
class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }
  
  /**
   * Получить следующее случайное число от 0 до 1
   * @returns {number} Случайное число от 0 до 1
   */
  random() {
    // LCG параметры (используются в glibc)
    const a = 1103515245;
    const c = 12345;
    const m = 2 ** 31;
    
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }
  
  /**
   * Случайное целое число в диапазоне [min, max]
   * @param {number} min - Минимальное значение
   * @param {number} max - Максимальное значение  
   * @returns {number} Случайное целое число
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  
  /**
   * Fisher-Yates shuffle с использованием seeded random
   * @param {Array} array - Массив для перемешивания
   * @returns {Array} Перемешанный массив
   */
  shuffle(array) {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
}

/**
 * Создать генератор с заданным сидом
 * @param {number} seed - Сид для генератора
 * @returns {SeededRandom} Экземпляр генератора
 */
function createSeededRandom(seed) {
  return new SeededRandom(seed);
}

/**
 * Удалить дубликаты из массива объектов по заданному ключу
 * @param {Array} array - Массив объектов
 * @param {string} key - Ключ для сравнения (например, 'id')
 * @returns {Array} Массив без дубликатов
 */
function removeDuplicatesBy(array, key) {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Проверить качество рандомизации (для тестирования)
 * Возвращает статистику распределения элементов после множественных перемешиваний
 * @param {Array} array - Тестовый массив
 * @param {number} iterations - Количество итераций тестирования
 * @returns {Object} Статистика распределения
 */
function testRandomizationQuality(array, iterations = 1000) {
  if (!array || array.length === 0) {
    return { error: 'Empty array provided' };
  }
  
  const positionCounts = array.map(() => new Array(array.length).fill(0));
  
  for (let i = 0; i < iterations; i++) {
    const shuffled = fisherYatesShuffle(array);
    shuffled.forEach((item, position) => {
      const originalIndex = array.indexOf(item);
      positionCounts[originalIndex][position]++;
    });
  }
  
  // Вычисляем статистику
  const expectedFrequency = iterations / array.length;
  let totalDeviation = 0;
  let maxDeviation = 0;
  
  positionCounts.forEach((counts, elementIndex) => {
    counts.forEach((count, position) => {
      const deviation = Math.abs(count - expectedFrequency) / expectedFrequency;
      totalDeviation += deviation;
      maxDeviation = Math.max(maxDeviation, deviation);
    });
  });
  
  const averageDeviation = totalDeviation / (array.length * array.length);
  
  return {
    iterations,
    expectedFrequency,
    averageDeviation: averageDeviation.toFixed(4),
    maxDeviation: maxDeviation.toFixed(4),
    quality: averageDeviation < 0.1 ? 'excellent' : 
             averageDeviation < 0.2 ? 'good' : 
             averageDeviation < 0.4 ? 'fair' : 'poor'
  };
}

module.exports = {
  fisherYatesShuffle,
  randomChoice,
  randomSample,
  weightedRandomChoice,
  SeededRandom,
  createSeededRandom,
  removeDuplicatesBy,
  testRandomizationQuality
};