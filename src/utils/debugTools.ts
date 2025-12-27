/**
 * Debug Tools for FSRS Testing
 * 
 * Admin-only utilities for testing the scheduling system:
 * - Reset deck progress
 * - Force all cards due
 * - Time travel (simulate days passing)
 * - Get card debug info
 * - Interval calculation logging
 */

import { Flashcard, FSRSState, ReviewRating } from '../types/flashcard';
import {
  LEARNING_STEPS,
  STARTING_EASE,
  calculateRetrievabilityPowerLaw,
  daysBetween,
} from './spacedRepetition';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Debug info for a single card
 */
export interface CardDebugInfo {
  cardId: string;
  front: string;
  
  // Learning state
  learningState: string;
  learningStep: number;
  learningCardType: string;
  
  // FSRS state
  state: string;
  stability: number;
  difficulty: number;
  easeFactor: number;
  
  // Retrievability
  retrievability: number;
  retrievabilityPercent: string;
  
  // Timing
  daysSinceLastReview: number;
  daysUntilDue: number;
  isOverdue: boolean;
  
  // Stats
  reps: number;
  lapses: number;
  isLeech: boolean;
}

/**
 * Interval calculation log entry
 */
export interface IntervalCalculationLog {
  cardId: string;
  timestamp: Date;
  input: {
    stability: number;
    difficulty: number;
    elapsedDays: number;
    retrievability: number;
    learningState: string;
    learningStep: number;
  };
  rating: ReviewRating;
  formula: string;
  output: {
    newStability: number;
    intervalDays: number;
    nextReviewDate: Date;
    wasGraduated: boolean;
  };
}

// ============================================================================
// RESET FUNCTIONS
// ============================================================================

/**
 * Reset a card to "new" state (never seen)
 * Clears all learning progress
 */
export function resetCardToNew(card: Flashcard): Partial<Flashcard> {
  return {
    // Learning phase reset
    learningState: 'LEARNING',
    learningStep: 0,
    learningSteps: LEARNING_STEPS,
    learningCardType: 'INTRADAY',
    
    // FSRS reset
    state: FSRSState.New,
    stability: 0,
    difficulty: 5, // Default middle difficulty
    easeFactor: STARTING_EASE,
    retrievability: undefined,
    rAtExam: undefined,
    
    // Schedule reset
    nextReviewDate: new Date(), // Due immediately
    originalDueDate: undefined,
    
    // Stats reset
    reps: 0,
    lapses: 0,
    lastReview: undefined,
    lastResponse: undefined,
    reviewTimeMs: undefined,
    
    // Leech reset
    isLeech: false,
    leechSuspended: false,
    leechAction: undefined,
    
    // Mastery reset
    mastery: 'LEARNING',
    
    // TEST_PREP reset
    currentStep: 0,
    
    // Legacy
    againCount: 0,
    responseHistory: [],
  };
}

/**
 * Force a card to be due now (keep all progress)
 */
export function forceCardDue(card: Flashcard): Partial<Flashcard> {
  return {
    nextReviewDate: new Date(),
    originalDueDate: card.nextReviewDate, // Save original for reference
  };
}

/**
 * Simulate time passing for a card
 * Shifts lastReview and nextReviewDate back by X days
 * This makes it look like the review happened X days ago
 */
export function simulateTimePassing(card: Flashcard, days: number): Partial<Flashcard> {
  const msToSubtract = days * 24 * 60 * 60 * 1000;
  
  const updates: Partial<Flashcard> = {};
  
  // Shift nextReviewDate back
  if (card.nextReviewDate) {
    const newNextReview = new Date(card.nextReviewDate.getTime() - msToSubtract);
    updates.nextReviewDate = newNextReview;
  }
  
  // Shift lastReview back (so elapsed days increase)
  if (card.lastReview) {
    const lastReviewDate = card.lastReview instanceof Date 
      ? card.lastReview 
      : new Date(card.lastReview);
    updates.lastReview = new Date(lastReviewDate.getTime() - msToSubtract);
  }
  
  return updates;
}

// ============================================================================
// DEBUG INFO FUNCTIONS
// ============================================================================

/**
 * Get comprehensive debug info for a card
 */
export function getCardDebugInfo(card: Flashcard): CardDebugInfo {
  const now = new Date();
  
  // Calculate days since last review
  let daysSinceLastReview = 0;
  if (card.lastReview) {
    const lastReviewDate = card.lastReview instanceof Date 
      ? card.lastReview 
      : new Date(card.lastReview);
    daysSinceLastReview = daysBetween(lastReviewDate, now);
  }
  
  // Calculate days until due
  const nextReviewDate = card.nextReviewDate instanceof Date 
    ? card.nextReviewDate 
    : new Date(card.nextReviewDate);
  const daysUntilDue = Math.round((nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate retrievability
  let retrievability = 1.0;
  if (card.stability && card.stability > 0 && daysSinceLastReview > 0) {
    retrievability = calculateRetrievabilityPowerLaw(card.stability, daysSinceLastReview);
  }
  
  // Map FSRS state to readable string
  const stateNames = ['New', 'Learning', 'Review', 'Relearning'];
  const stateString = stateNames[card.state] || 'Unknown';
  
  return {
    cardId: card.id,
    front: card.front.substring(0, 50) + (card.front.length > 50 ? '...' : ''),
    
    learningState: card.learningState || 'GRADUATED',
    learningStep: card.learningStep || 0,
    learningCardType: card.learningCardType || 'N/A',
    
    state: stateString,
    stability: Math.round((card.stability || 0) * 100) / 100,
    difficulty: Math.round((card.difficulty || 5) * 100) / 100,
    easeFactor: Math.round((card.easeFactor || STARTING_EASE) * 100) / 100,
    
    retrievability: Math.round(retrievability * 1000) / 1000,
    retrievabilityPercent: `${Math.round(retrievability * 100)}%`,
    
    daysSinceLastReview,
    daysUntilDue,
    isOverdue: daysUntilDue < 0,
    
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    isLeech: card.isLeech || false,
  };
}

/**
 * Get debug info for all cards in a deck
 */
export function getDeckDebugInfo(cards: Flashcard[]): {
  summary: {
    total: number;
    newCards: number;
    learning: number;
    review: number;
    relearning: number;
    overdue: number;
    leeches: number;
    avgStability: number;
    avgDifficulty: number;
    avgRetrievability: number;
  };
  cards: CardDebugInfo[];
} {
  const cardInfos = cards.map(getCardDebugInfo);
  
  const newCards = cardInfos.filter(c => c.state === 'New').length;
  const learning = cardInfos.filter(c => c.state === 'Learning').length;
  const review = cardInfos.filter(c => c.state === 'Review').length;
  const relearning = cardInfos.filter(c => c.state === 'Relearning').length;
  const overdue = cardInfos.filter(c => c.isOverdue).length;
  const leeches = cardInfos.filter(c => c.isLeech).length;
  
  const avgStability = cardInfos.length > 0
    ? cardInfos.reduce((sum, c) => sum + c.stability, 0) / cardInfos.length
    : 0;
    
  const avgDifficulty = cardInfos.length > 0
    ? cardInfos.reduce((sum, c) => sum + c.difficulty, 0) / cardInfos.length
    : 0;
    
  const avgRetrievability = cardInfos.length > 0
    ? cardInfos.reduce((sum, c) => sum + c.retrievability, 0) / cardInfos.length
    : 0;
  
  return {
    summary: {
      total: cards.length,
      newCards,
      learning,
      review,
      relearning,
      overdue,
      leeches,
      avgStability: Math.round(avgStability * 100) / 100,
      avgDifficulty: Math.round(avgDifficulty * 100) / 100,
      avgRetrievability: Math.round(avgRetrievability * 1000) / 1000,
    },
    cards: cardInfos,
  };
}

// ============================================================================
// INTERVAL LOGGING
// ============================================================================

/**
 * Create an interval calculation log entry
 */
export function createIntervalLog(
  card: Flashcard,
  rating: ReviewRating,
  formula: string,
  output: {
    newStability: number;
    intervalDays: number;
    nextReviewDate: Date;
    wasGraduated: boolean;
  }
): IntervalCalculationLog {
  const now = new Date();
  
  let elapsedDays = 0;
  if (card.lastReview) {
    const lastReviewDate = card.lastReview instanceof Date 
      ? card.lastReview 
      : new Date(card.lastReview);
    elapsedDays = daysBetween(lastReviewDate, now);
  }
  
  let retrievability = 1.0;
  if (card.stability && card.stability > 0 && elapsedDays > 0) {
    retrievability = calculateRetrievabilityPowerLaw(card.stability, elapsedDays);
  }
  
  return {
    cardId: card.id,
    timestamp: now,
    input: {
      stability: card.stability || 0,
      difficulty: card.difficulty || 5,
      elapsedDays,
      retrievability,
      learningState: card.learningState || 'GRADUATED',
      learningStep: card.learningStep || 0,
    },
    rating,
    formula,
    output,
  };
}

/**
 * Format an interval log entry for display
 */
export function formatIntervalLog(log: IntervalCalculationLog): string {
  const lines = [
    `=== ${log.rating} pressed at ${log.timestamp.toLocaleTimeString()} ===`,
    `Card: ${log.cardId.substring(0, 8)}...`,
    ``,
    `Input:`,
    `  State: ${log.input.learningState} (step ${log.input.learningStep})`,
    `  Stability: ${log.input.stability.toFixed(2)} days`,
    `  Difficulty: ${log.input.difficulty.toFixed(2)}/10`,
    `  Elapsed: ${log.input.elapsedDays} days`,
    `  Retrievability: ${(log.input.retrievability * 100).toFixed(1)}%`,
    ``,
    `Formula: ${log.formula}`,
    ``,
    `Output:`,
    `  New Stability: ${log.output.newStability.toFixed(2)} days`,
    `  Interval: ${log.output.intervalDays} days`,
    `  Next Review: ${log.output.nextReviewDate.toLocaleDateString()}`,
    log.output.wasGraduated ? `  *** GRADUATED ***` : '',
  ];
  
  return lines.filter(Boolean).join('\n');
}

