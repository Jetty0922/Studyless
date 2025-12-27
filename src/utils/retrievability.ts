/**
 * Retrievability Engine
 * 
 * Implements the core retrievability calculations for FSRS-based scheduling.
 * Based on the DSR (Difficulty, Stability, Retrievability) model.
 * 
 * Key formulas:
 * - R(t) = (1 + factor × t/S)^(-power)  [Power law decay]
 * - Triangular fuzz distribution for load balancing
 */

import { Flashcard } from '../types/flashcard';

// ============================================================================
// FSRS-5 DECAY PARAMETERS
// ============================================================================

/** Decay factor for retrievability calculation */
export const DECAY_FACTOR = 0.5;

/** Decay power for retrievability calculation */
export const DECAY_POWER = 0.5;

// ============================================================================
// CORE RETRIEVABILITY FUNCTIONS
// ============================================================================

/**
 * Calculate retrievability using FSRS power law
 * 
 * Formula: R(t) = (1 + factor × t/S)^(-power)
 * 
 * @param stability - Memory stability in days
 * @param daysSinceReview - Days elapsed since last review
 * @returns Retrievability (0-1), probability of successful recall
 */
export function calculateRetrievability(
  stability: number,
  daysSinceReview: number
): number {
  if (stability <= 0) return 1.0;
  if (daysSinceReview < 0) return 1.0;
  if (daysSinceReview === 0) return 1.0;
  
  return Math.pow(
    1 + (DECAY_FACTOR * daysSinceReview / stability),
    -DECAY_POWER
  );
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return diffTime / (1000 * 60 * 60 * 24);
}

/**
 * Get current retrievability for a card
 * 
 * @param card - Flashcard to calculate R for
 * @returns Current retrievability (0-1)
 */
export function getCardRetrievability(card: Flashcard): number {
  if (!card.lastReview || !card.stability) return 1.0;
  
  const lastReviewDate = card.lastReview instanceof Date 
    ? card.lastReview 
    : new Date(card.lastReview);
  
  const daysSince = daysBetween(lastReviewDate, new Date());
  return calculateRetrievability(card.stability, daysSince);
}

/**
 * Project retrievability at a future date (for exam scheduling)
 * 
 * @param card - Flashcard to project R for
 * @param targetDate - Future date to project to
 * @returns Projected retrievability at target date (0-1)
 */
export function projectRetrievabilityAtDate(
  card: Flashcard,
  targetDate: Date
): number {
  if (!card.lastReview || !card.stability) return 0.5;
  
  const lastReviewDate = card.lastReview instanceof Date 
    ? card.lastReview 
    : new Date(card.lastReview);
  
  const totalDays = daysBetween(lastReviewDate, targetDate);
  return calculateRetrievability(card.stability, totalDays);
}

/**
 * Sort cards by retrievability (lowest first = most urgent)
 * 
 * @param cards - Array of flashcards to sort
 * @returns New array sorted by R (ascending)
 */
export function sortByRetrievability(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => {
    const rA = getCardRetrievability(a);
    const rB = getCardRetrievability(b);
    return rA - rB;
  });
}

/**
 * Sort cards by projected R at exam date (lowest first)
 * 
 * @param cards - Array of flashcards to sort
 * @param examDate - Target exam date
 * @returns New array sorted by R_exam (ascending)
 */
export function sortByRAtExam(cards: Flashcard[], examDate: Date): Flashcard[] {
  return [...cards]
    .map(card => ({
      card,
      rAtExam: projectRetrievabilityAtDate(card, examDate)
    }))
    .sort((a, b) => a.rAtExam - b.rAtExam)
    .map(({ card }) => card);
}

/**
 * Calculate when R will drop below threshold
 * 
 * Solves: threshold = (1 + factor × t/S)^(-power)
 * For t: t = S × ((threshold^(-1/power)) - 1) / factor
 * 
 * @param stability - Current stability in days
 * @param threshold - Target retrievability threshold (e.g., 0.9)
 * @returns Days until R drops to threshold
 */
export function daysUntilRetrievabilityDrops(
  stability: number,
  threshold: number = 0.9
): number {
  if (stability <= 0) return 0;
  if (threshold <= 0 || threshold >= 1) return 0;
  
  const t = stability * (Math.pow(threshold, -1 / DECAY_POWER) - 1) / DECAY_FACTOR;
  return Math.max(0, t);
}

/**
 * Calculate optimal review time based on target R
 * 
 * @param stability - Current stability in days
 * @param targetR - Target retrievability at review time
 * @returns Days from last review to optimal review time
 */
export function calculateOptimalReviewTime(
  stability: number,
  targetR: number = 0.9
): number {
  return daysUntilRetrievabilityDrops(stability, targetR);
}

// ============================================================================
// TRIANGULAR FUZZ DISTRIBUTION
// ============================================================================

/**
 * Generate random number from triangular distribution
 * 
 * Triangular distribution peaks at mode and tapers toward low/high.
 * Better than uniform distribution for interval fuzzing.
 * 
 * @param low - Minimum value
 * @param mode - Most likely value (peak)
 * @param high - Maximum value
 * @returns Random value from triangular distribution
 */
export function triangularRandom(
  low: number,
  mode: number,
  high: number
): number {
  if (low >= high) return mode;
  if (mode < low) mode = low;
  if (mode > high) mode = high;
  
  const u = Math.random();
  const fc = (mode - low) / (high - low);
  
  if (u < fc) {
    return low + Math.sqrt(u * (high - low) * (mode - low));
  } else {
    return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
  }
}

/**
 * Apply triangular fuzz to interval
 * 
 * Graduated fuzz based on interval length:
 * - < 2 days: No fuzz
 * - 2-7 days: ±25%
 * - 7-30 days: ±15%
 * - 30+ days: ±5%
 * 
 * @param interval - Base interval in days
 * @returns Fuzzed interval in days
 */
export function applyTriangularFuzz(interval: number): number {
  if (interval < 2) return interval;
  
  let fuzzPercent: number;
  if (interval < 7) {
    fuzzPercent = 0.25;
  } else if (interval < 30) {
    fuzzPercent = 0.15;
  } else {
    fuzzPercent = 0.05;
  }
  
  const low = interval * (1 - fuzzPercent);
  const high = interval * (1 + fuzzPercent);
  
  return Math.max(1, Math.round(triangularRandom(low, interval, high)));
}

// ============================================================================
// CARD FILTERING BY RETRIEVABILITY
// ============================================================================

/**
 * Get cards with R below threshold
 * 
 * @param cards - Array of flashcards
 * @param threshold - R threshold (cards with R < threshold are returned)
 * @returns Cards with R below threshold, sorted by R (lowest first)
 */
export function getCardsBelowRetrievability(
  cards: Flashcard[],
  threshold: number
): Flashcard[] {
  return cards
    .filter(card => getCardRetrievability(card) < threshold)
    .sort((a, b) => getCardRetrievability(a) - getCardRetrievability(b));
}

/**
 * Get overdue cards sorted by urgency (lowest R first)
 * 
 * @param cards - Array of flashcards
 * @returns Overdue cards sorted by R (most urgent first)
 */
export function getOverdueCardsByUrgency(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  
  return cards
    .filter(card => {
      const dueDate = card.nextReviewDate instanceof Date 
        ? card.nextReviewDate 
        : new Date(card.nextReviewDate);
      return dueDate < now;
    })
    .sort((a, b) => getCardRetrievability(a) - getCardRetrievability(b));
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate average retrievability for a set of cards
 * 
 * @param cards - Array of flashcards
 * @returns Average R across all cards
 */
export function getAverageRetrievability(cards: Flashcard[]): number {
  if (cards.length === 0) return 0;
  
  const totalR = cards.reduce((sum, card) => sum + getCardRetrievability(card), 0);
  return totalR / cards.length;
}

/**
 * Get retrievability distribution for cards
 * 
 * @param cards - Array of flashcards
 * @returns Object with counts for each R bracket
 */
export function getRetrievabilityDistribution(cards: Flashcard[]): {
  excellent: number;  // R >= 0.95
  good: number;       // R >= 0.85
  fair: number;       // R >= 0.70
  poor: number;       // R >= 0.50
  critical: number;   // R < 0.50
} {
  const dist = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0
  };
  
  cards.forEach(card => {
    const r = getCardRetrievability(card);
    if (r >= 0.95) dist.excellent++;
    else if (r >= 0.85) dist.good++;
    else if (r >= 0.70) dist.fair++;
    else if (r >= 0.50) dist.poor++;
    else dist.critical++;
  });
  
  return dist;
}

/**
 * Calculate projected average R at exam date
 * 
 * @param cards - Array of flashcards
 * @param examDate - Target exam date
 * @returns Average projected R at exam
 */
export function getAverageRAtExam(cards: Flashcard[], examDate: Date): number {
  if (cards.length === 0) return 0;
  
  const totalR = cards.reduce(
    (sum, card) => sum + projectRetrievabilityAtDate(card, examDate), 
    0
  );
  return totalR / cards.length;
}

