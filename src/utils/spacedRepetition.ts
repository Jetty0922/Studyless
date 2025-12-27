/**
 * Spaced Repetition Scheduling System
 * 
 * This module implements the complete scheduling logic for StudyLess:
 * - Learning Steps (Anki-style)
 * - Day Boundary handling (4 AM cutoff)
 * - TEST_PREP mode (ladder-based)
 * - LONG_TERM mode (FSRS-based)
 * - Fuzz functions
 * - Leech detection
 * - Mode switching
 * - Due card detection
 */

import {
  addDays,
  startOfDay as dateStartOfDay,
  differenceInDays,
  isAfter,
  subDays,
  isSameDay,
} from "date-fns";
import { Card as FSRSCard, FSRS, Rating as FSRSRating, generatorParameters, State } from "ts-fsrs";
import { 
  Flashcard, 
  ReviewRating, 
  Deck, 
  LearningState, 
  LearningCardType,
  MasteryLevel,
  FSRSState,
  Rating,
  ScheduleWarning
} from "../types/flashcard";

// ============================================================================
// PART 1: CONSTANTS
// ============================================================================

/**
 * Default learning steps for NEW cards
 * [900, 3600] = 15 minutes, then 1 hour (in SECONDS)
 */
export const LEARNING_STEPS = [900, 3600];

/**
 * Relearning steps for LAPSED cards
 * [600] = 10 minutes (in SECONDS)
 */
export const RELEARNING_STEPS = [600];

/**
 * Early review buffer for INTRADAY learning cards
 * Cards can be shown up to 20 minutes early if nothing else to study
 */
export const EARLY_REVIEW_BUFFER_SECONDS = 1200;

/**
 * Day boundary hour (4 AM)
 * All INTERDAY cards normalize to 4 AM
 */
export const DAY_BOUNDARY_HOUR = 4;

/**
 * Standard ladder for TEST_PREP mode (intervals in DAYS)
 */
export const STANDARD_LADDER = [0, 1, 3, 7, 14, 21, 28, 35, 45, 60];

/**
 * Mastery threshold for TEST_PREP
 * Cards at step >= 8 are considered MASTERED
 */
export const MASTERY_STEP_THRESHOLD = 8;

/**
 * Minimum interval (in DAYS) before applying fuzz
 * UNIFIED for both TEST_PREP and LONG_TERM modes
 */
export const FUZZ_MIN_INTERVAL_DAYS = 2;

/**
 * Leech threshold - card is marked as leech when lapses >= 6
 */
export const LEECH_THRESHOLD = 6;

/**
 * Mastery thresholds for LONG_TERM mode
 */
export const MASTERY_THRESHOLDS = {
  stabilityForMastered: 21,  // 3 weeks
  lapsesForStruggling: 2,
};

/**
 * Minimum intervals for LONG_TERM (FSRS) mode (in milliseconds)
 */
export const LONG_TERM_MIN_INTERVALS = {
  again: 60000,     // 1 minute
  hard: 300000,     // 5 minutes
  good: 600000,     // 10 minutes
  easy: 0           // No minimum
};

/**
 * Default FSRS parameters (19 weights for FSRS-5)
 */
export const DEFAULT_FSRS_PARAMETERS = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102,
  0.5316, 1.0651, 0.0234, 1.616, 0.1544,
  1.0824, 1.9813, 0.0953, 0.2975, 2.2042,
  0.2407, 2.9466, 0.5034, 0.6567
];

// ============================================================================
// PART 2: DATE/TIME UTILITIES
// ============================================================================

/**
 * Get start of day normalized to DAY_BOUNDARY_HOUR (4 AM)
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(DAY_BOUNDARY_HOUR, 0, 0, 0);
  return d;
}

/**
 * Add seconds to a date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate next review with day boundary handling
 * 
 * Rules:
 * 1. If interval < 24h BUT crosses midnight → next day at 4 AM (INTERDAY)
 * 2. If interval >= 24h → normalize to 4 AM of target day (INTERDAY)
 * 3. If interval doesn't cross midnight → exact timestamp (INTRADAY)
 */
export function calculateNextReviewWithBoundary(
  currentTime: Date,
  intervalSeconds: number
): { date: Date; cardType: LearningCardType } {
  const intervalMs = intervalSeconds * 1000;
  const nextReview = new Date(currentTime.getTime() + intervalMs);
  
  // Check if crosses day boundary
  const currentDay = currentTime.getDate();
  const nextDay = nextReview.getDate();
  const crossesDayBoundary = currentDay !== nextDay || 
    currentTime.getMonth() !== nextReview.getMonth() ||
    currentTime.getFullYear() !== nextReview.getFullYear();
  
  // Check if less than 24 hours
  const isLessThan24Hours = intervalSeconds < 86400;
  
  if (isLessThan24Hours && crossesDayBoundary) {
    // Rule 1: Convert to next day at 4 AM
    const tomorrow = addDays(currentTime, 1);
    const normalized = startOfDay(tomorrow);
    return { date: normalized, cardType: 'INTERDAY' };
  } else if (!isLessThan24Hours) {
    // Rule 2: Already >= 24 hours, normalize to 4 AM of target day
    const normalized = startOfDay(nextReview);
    return { date: normalized, cardType: 'INTERDAY' };
  } else {
    // Rule 3: Same day, exact timestamp
    return { date: nextReview, cardType: 'INTRADAY' };
  }
}

// ============================================================================
// PART 3: FUZZ FUNCTIONS
// ============================================================================

/**
 * Apply fuzz to TEST_PREP intervals
 * < 2 days: No fuzz
 * >= 2 days: ±25% of interval, minimum ±1 day
 */
export function applyFuzz(baseInterval: number): number {
  if (baseInterval < FUZZ_MIN_INTERVAL_DAYS) {
    return baseInterval;
  }
  
  const fuzzRange = Math.max(1, Math.floor(baseInterval * 0.25));
  const fuzz = Math.floor(Math.random() * (2 * fuzzRange + 1)) - fuzzRange;
  
  return Math.max(1, baseInterval + fuzz);
}

/**
 * Apply fuzz to LONG_TERM (FSRS) intervals
 * Graduated fuzz based on interval length:
 * - 2-7 days: ±25% or ±1 day (whichever larger)
 * - 7-30 days: ±15%
 * - 30+ days: ±5%
 */
export function applyFSRSFuzz(interval: number): number {
  if (interval < FUZZ_MIN_INTERVAL_DAYS) {
    return interval;
  }
  
  let fuzzRange: number;
  
  if (interval < 7) {
    fuzzRange = Math.max(1, interval * 0.25);
  } else if (interval < 30) {
    fuzzRange = interval * 0.15;
  } else {
    fuzzRange = interval * 0.05;
  }
  
  const fuzz = (Math.random() * 2 - 1) * fuzzRange;
  return Math.max(1, Math.round(interval + fuzz));
}

// ============================================================================
// PART 4: FSRS INITIALIZATION
// ============================================================================

/**
 * Create FSRS instance with app configuration
 */
export function createFSRS(parameters: number[] = DEFAULT_FSRS_PARAMETERS): FSRS {
  return new FSRS(generatorParameters({
    w: parameters,
    enable_fuzz: false,
    maximum_interval: 365,
    request_retention: 0.90
  }));
}

// Default FSRS instance
const fsrs = createFSRS();

/**
 * Find closest ladder step for a given stability
 */
export function findClosestLadderStep(stability: number, ladder: number[] = STANDARD_LADDER): number {
  let closestStep = 0;
  let minDiff = Math.abs(ladder[0] - stability);
  
  for (let i = 1; i < ladder.length; i++) {
    const diff = Math.abs(ladder[i] - stability);
    if (diff < minDiff) {
      minDiff = diff;
      closestStep = i;
    }
  }
  
  return closestStep;
}

// ============================================================================
// PART 5: LEARNING PHASE LOGIC
// ============================================================================

/**
 * Calculate next review for a card in LEARNING or RELEARNING phase
 */
export function calculateLearningReview(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  const currentStep = card.learningStep || 0;
  const steps = card.learningSteps || LEARNING_STEPS;
  
  // AGAIN: Reset to step 0
  if (rating === "AGAIN") {
    const intervalSeconds = steps[0];
    const { date, cardType } = calculateNextReviewWithBoundary(now, intervalSeconds);
    const newLapses = (card.lapses || 0) + 1;
    
    return {
      learningStep: 0,
      nextReviewDate: date,
      learningCardType: cardType,
      lapses: newLapses,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating,
      isLeech: newLapses >= LEECH_THRESHOLD,
      mastery: 'STRUGGLING'
    };
  }
  
  // HARD: Special logic based on current step
  if (rating === "HARD") {
    let intervalSeconds: number;
    let newStep = currentStep;
    
    if (currentStep === 0 && steps.length > 1) {
      // Average of first two steps
      intervalSeconds = Math.round((steps[0] + steps[1]) / 2);
    } else if (currentStep === 0 && steps.length === 1) {
      // 1.5x current step (max: current + 1 day)
      const oneDaySeconds = 86400;
      intervalSeconds = Math.min(Math.round(steps[0] * 1.5), steps[0] + oneDaySeconds);
    } else {
      // Repeat current step
      intervalSeconds = steps[currentStep];
    }
    
    const { date, cardType } = calculateNextReviewWithBoundary(now, intervalSeconds);
    
    return {
      learningStep: newStep,
      nextReviewDate: date,
      learningCardType: cardType,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  }
  
  // GOOD: Advance to next step or graduate
  if (rating === "GOOD") {
    if (currentStep < steps.length - 1) {
      // Advance to next step
      const newStep = currentStep + 1;
      const intervalSeconds = steps[newStep];
      const { date, cardType } = calculateNextReviewWithBoundary(now, intervalSeconds);
      
      return {
        learningStep: newStep,
        nextReviewDate: date,
        learningCardType: cardType,
        reps: (card.reps || 0) + 1,
        lastReview: now,
        lastResponse: rating
      };
    } else {
      // Graduate!
      return graduateCard(card, rating, now);
    }
  }
  
  // EASY: Graduate immediately
  if (rating === "EASY") {
    return graduateCard(card, rating, now);
  }
  
  throw new Error(`Invalid rating: ${rating}`);
}

/**
 * Graduate a card from learning to review phase
 */
export function graduateCard(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  // Build FSRS card for initial stability calculation
  const fsrsCard: FSRSCard = {
    due: now,
    stability: card.stability || 0,
    difficulty: card.difficulty || 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: card.learningState === 'RELEARNING' ? State.Relearning : State.New,
    last_review: undefined,
    learning_steps: 0,
  };
  
  // Call FSRS for initial stability
  const fsrsRating = rating === "EASY" ? FSRSRating.Easy : FSRSRating.Good;
  const schedulingCards = fsrs.repeat(fsrsCard, now);
  const result = schedulingCards[fsrsRating].card;
  
  // NO FUZZ on graduation - first review should be predictable
  const stabilityDays = result.stability;
  
  if (card.mode === 'TEST_PREP') {
    // TEST_PREP: Map stability to ladder, freeze FSRS values
    const schedule = card.schedule || STANDARD_LADDER;
    const closestStep = findClosestLadderStep(stabilityDays, schedule);
    const intervalDays = schedule[closestStep];
    const nextReview = addDays(startOfDay(now), intervalDays);
    
    return {
      learningState: 'GRADUATED',
      learningStep: 0,
      learningCardType: undefined,
      currentStep: closestStep,
      stability: stabilityDays,
      difficulty: result.difficulty,
      state: FSRSState.Review,
      mastery: closestStep >= MASTERY_STEP_THRESHOLD ? 'MASTERED' : 'LEARNING',
      nextReviewDate: nextReview,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  } else {
    // LONG_TERM: Use FSRS directly
    const nextReview = addDays(now, stabilityDays);
    
    return {
      learningState: 'GRADUATED',
      learningStep: 0,
      learningCardType: undefined,
      stability: stabilityDays,
      difficulty: result.difficulty,
      state: FSRSState.Review,
      mastery: stabilityDays >= MASTERY_THRESHOLDS.stabilityForMastered ? 'MASTERED' : 'LEARNING',
      nextReviewDate: nextReview,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  }
}

// ============================================================================
// PART 6: TEST_PREP REVIEW LOGIC (GRADUATED CARDS)
// ============================================================================

/**
 * Helper: Apply date cap (brick wall)
 */
export const applyDateCap = (calculatedDate: Date, testDate: Date): Date => {
  const wall = subDays(dateStartOfDay(testDate), 1);
  return isAfter(calculatedDate, wall) ? wall : calculatedDate;
};

/**
 * Generate schedule based on test date
 */
export const generateSchedule = (testDate: Date): number[] => {
  const today = dateStartOfDay(new Date());
  const daysLeft = differenceInDays(dateStartOfDay(testDate), today);

  if (daysLeft <= 1) {
    return [0];
  }

  return STANDARD_LADDER.filter((interval) => interval < daysLeft);
};

/**
 * Calculate next review for graduated TEST_PREP card
 */
export function calculateTestPrepReview(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  const today = startOfDay(now);
  const testDate = card.testDate instanceof Date 
    ? card.testDate 
    : card.testDate ? new Date(card.testDate) : addDays(today, 30);
  
  const schedule = card.schedule || generateSchedule(testDate);
  const currentStep = card.currentStep || 0;
  
  // AGAIN: Enter relearning phase
  if (rating === "AGAIN") {
    const newLapses = (card.lapses || 0) + 1;
    
    return {
      learningState: 'RELEARNING',
      learningStep: 0,
      learningSteps: RELEARNING_STEPS,
      learningCardType: 'INTRADAY',
      nextReviewDate: addSeconds(now, RELEARNING_STEPS[0]),
      currentStep: 0,  // Reset after relearning completes
      lapses: newLapses,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating,
      mastery: 'STRUGGLING',
      isLeech: newLapses >= LEECH_THRESHOLD
    };
  }
  
  // HARD: Regress 1 step
  if (rating === "HARD") {
    const newStep = Math.max(0, currentStep - 1);
    const baseInterval = schedule[newStep] || 1;
    const fuzzedInterval = applyFuzz(Math.max(1, baseInterval));
    const nextReview = applyDateCap(addDays(today, fuzzedInterval), testDate);
    
    return {
      currentStep: newStep,
      nextReviewDate: nextReview,
      mastery: 'STRUGGLING',
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  }
  
  // GOOD: Advance 1 step
  if (rating === "GOOD") {
    const newStep = Math.min(schedule.length - 1, currentStep + 1);
    const baseInterval = schedule[newStep];
    const fuzzedInterval = applyFuzz(baseInterval);
    const nextReview = applyDateCap(addDays(today, fuzzedInterval), testDate);
    
    return {
      currentStep: newStep,
      nextReviewDate: nextReview,
      mastery: newStep >= MASTERY_STEP_THRESHOLD ? 'MASTERED' : 'LEARNING',
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  }
  
  // EASY: Skip 1 step (blocked if step < 2)
  if (rating === "EASY") {
    if (currentStep < 2) {
      // Treat as GOOD
      return calculateTestPrepReview(card, "GOOD", now);
    }
    
    const newStep = Math.min(schedule.length - 1, currentStep + 2);
    const baseInterval = schedule[newStep];
    const fuzzedInterval = applyFuzz(baseInterval);
    const nextReview = applyDateCap(addDays(today, fuzzedInterval), testDate);
    
    return {
      currentStep: newStep,
      nextReviewDate: nextReview,
      mastery: newStep >= MASTERY_STEP_THRESHOLD ? 'MASTERED' : 'LEARNING',
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  }
  
  throw new Error(`Invalid rating: ${rating}`);
}

// ============================================================================
// PART 7: LONG_TERM REVIEW LOGIC (GRADUATED CARDS)
// ============================================================================

/**
 * Calculate next review for graduated LONG_TERM card
 */
export function calculateLongTermReview(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  // AGAIN: Enter relearning phase
  if (rating === "AGAIN") {
    const newLapses = (card.lapses || 0) + 1;
    
    return {
      learningState: 'RELEARNING',
      learningStep: 0,
      learningSteps: RELEARNING_STEPS,
      learningCardType: 'INTRADAY',
      nextReviewDate: addSeconds(now, RELEARNING_STEPS[0]),
      state: FSRSState.Relearning,
      lapses: newLapses,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating,
      mastery: 'STRUGGLING',
      isLeech: newLapses >= LEECH_THRESHOLD
    };
  }
  
  // Build FSRS card from current state
  const lastReviewDate = card.lastReview || card.last_review;
  const elapsedDays = lastReviewDate ? daysBetween(new Date(lastReviewDate), now) : 0;
  
  const fsrsCard: FSRSCard = {
    due: new Date(card.nextReviewDate),
    stability: card.stability || 0,
    difficulty: card.difficulty || 5,
    elapsed_days: elapsedDays,
    scheduled_days: card.stability || 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: card.state || State.Review,
    last_review: lastReviewDate ? new Date(lastReviewDate) : undefined,
    learning_steps: 0,
  };
  
  // Map rating
  const fsrsRating = rating === "HARD" ? FSRSRating.Hard
                   : rating === "GOOD" ? FSRSRating.Good
                   : FSRSRating.Easy;
  
  // Call FSRS
  const schedulingCards = fsrs.repeat(fsrsCard, now);
  const result = schedulingCards[fsrsRating].card;
  
  // Get stability and apply minimum intervals
  let stabilityDays = result.stability;
  const stabilityMs = stabilityDays * 24 * 60 * 60 * 1000;
  const minInterval = LONG_TERM_MIN_INTERVALS[
    rating === "HARD" ? 'hard' : rating === "GOOD" ? 'good' : 'easy'
  ];
  
  if (minInterval > 0 && stabilityMs < minInterval) {
    stabilityDays = minInterval / (24 * 60 * 60 * 1000);
  }
  
  // Apply fuzz
  const fuzzedDays = applyFSRSFuzz(stabilityDays);
  const nextReview = addDays(now, fuzzedDays);
  
  // Calculate mastery
  const mastery: MasteryLevel = (card.lapses || 0) >= MASTERY_THRESHOLDS.lapsesForStruggling
    ? 'STRUGGLING'
    : fuzzedDays >= MASTERY_THRESHOLDS.stabilityForMastered
    ? 'MASTERED'
    : 'LEARNING';
  
  return {
    stability: fuzzedDays,
    difficulty: result.difficulty,
    state: result.state as FSRSState,
    nextReviewDate: nextReview,
    mastery,
    reps: (card.reps || 0) + 1,
    lastReview: now,
    lastResponse: rating
  };
}

// ============================================================================
// PART 8: MAIN REVIEW FUNCTION (ORCHESTRATOR)
// ============================================================================

/**
 * Main review function - routes to correct logic
 */
export function reviewCard(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  // Learning or Relearning phase
  if (card.learningState !== 'GRADUATED') {
    return calculateLearningReview(card, rating, now);
  }
  
  // Graduated - route by mode
  if (card.mode === 'TEST_PREP') {
    return calculateTestPrepReview(card, rating, now);
  } else {
    return calculateLongTermReview(card, rating, now);
  }
}

/**
 * Legacy alias for compatibility
 */
export const handleReview = reviewCard;

// ============================================================================
// PART 9: DUE CARD DETECTION
// ============================================================================

/**
 * Helper to check if a deck is in Final Review Mode
 */
export const isFinalReviewDay = (testDate: Date): boolean => {
  const today = startOfDay(new Date());
  const dayBefore = subDays(dateStartOfDay(testDate), 1);
  return isSameDay(today, dayBefore);
};

/**
 * Helper to check if today is test day
 */
export const isTestDay = (testDate: Date): boolean => {
  const today = startOfDay(new Date());
  return isSameDay(today, dateStartOfDay(testDate));
};

/**
 * Get all due cards with proper priority ordering
 */
export function getDueCards(
  allCards: Flashcard[],
  decks: Deck[],
  testDayLockoutEnabled: boolean = true
): Flashcard[] {
  const now = new Date();
  const today = startOfDay(now);
  const earlyReviewCutoff = addSeconds(now, EARLY_REVIEW_BUFFER_SECONDS);
  
  const intradayLearning: Flashcard[] = [];
  const interdayLearning: Flashcard[] = [];
  const reviewCards: Flashcard[] = [];
  
  // Create deck lookup
  const deckMap: Record<string, Deck> = {};
  decks.forEach(d => { deckMap[d.id] = d; });
  
  for (const card of allCards) {
    // Skip suspended leeches
    if (card.leechSuspended) continue;
    
    const deck = deckMap[card.deckId];
    if (!deck) continue;
    
    // Test Day Lockout check
    if (deck.mode === 'TEST_PREP' && deck.testDate && testDayLockoutEnabled) {
      if (isTestDay(new Date(deck.testDate))) {
        continue;  // Skip all cards from this deck on test day
      }
    }
    
    // Final Review Day - all cards are due
    if (deck.mode === 'TEST_PREP' && deck.testDate) {
      if (isFinalReviewDay(new Date(deck.testDate))) {
        reviewCards.push(card);
        continue;
      }
    }
    
    // Learning/Relearning cards
    if (card.learningState !== 'GRADUATED') {
      const cardDue = new Date(card.nextReviewDate);
      
      if (card.learningCardType === 'INTRADAY') {
        // Exact timestamp with early buffer
        if (cardDue.getTime() <= earlyReviewCutoff.getTime()) {
          intradayLearning.push(card);
        }
      } else {
        // INTERDAY: Day-based comparison
        const cardDueDay = startOfDay(cardDue);
        if (cardDueDay.getTime() <= today.getTime()) {
          interdayLearning.push(card);
        }
      }
      continue;
    }
    
    // Graduated cards
    if (deck.mode === 'LONG_TERM') {
      // Exact timestamp comparison
      const cardDue = new Date(card.nextReviewDate);
      if (cardDue.getTime() <= now.getTime()) {
        reviewCards.push(card);
      }
    } else {
      // TEST_PREP: Day-based comparison
      const cardDueDay = startOfDay(new Date(card.nextReviewDate));
      if (cardDueDay.getTime() <= today.getTime()) {
        reviewCards.push(card);
      }
    }
  }
  
  // Sort each category
  intradayLearning.sort((a, b) => 
    new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
  );
  
  interdayLearning.sort((a, b) => {
    const dateCompare = new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
    return (masteryOrder[a.mastery] || 1) - (masteryOrder[b.mastery] || 1);
  });
  
  reviewCards.sort((a, b) => {
    const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
    const masteryCompare = (masteryOrder[a.mastery] || 1) - (masteryOrder[b.mastery] || 1);
    if (masteryCompare !== 0) return masteryCompare;
    
    return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
  });
  
  // Combine in priority order
  return [...intradayLearning, ...interdayLearning, ...reviewCards];
}

// ============================================================================
// PART 10: MODE SWITCHING
// ============================================================================

/**
 * Convert cards from TEST_PREP to LONG_TERM
 */
export function convertToLongTerm(cards: Flashcard[]): Partial<Flashcard>[] {
  const now = new Date();
  
  return cards.map(card => {
    if (card.learningState !== 'GRADUATED') {
      return { mode: 'LONG_TERM' as const };
    }
    
    const wasOverdue = new Date(card.nextReviewDate) < now;
    
    return {
      mode: 'LONG_TERM' as const,
      nextReviewDate: wasOverdue ? now : new Date(card.nextReviewDate),
      mastery: (card.lapses || 0) >= MASTERY_THRESHOLDS.lapsesForStruggling
        ? 'STRUGGLING' as const
        : (card.stability || 0) >= MASTERY_THRESHOLDS.stabilityForMastered
        ? 'MASTERED' as const
        : 'LEARNING' as const
    };
  });
}

/**
 * Convert cards from LONG_TERM to TEST_PREP
 */
export function convertToTestPrep(
  cards: Flashcard[],
  testDate: Date,
  ladder: number[] = STANDARD_LADDER
): Partial<Flashcard>[] {
  const now = new Date();
  const schedule = generateSchedule(testDate);
  
  return cards.map(card => {
    if (card.learningState !== 'GRADUATED') {
      return {
        mode: 'TEST_PREP' as const,
        testDate,
        schedule
      };
    }
    
    const closestStep = findClosestLadderStep(card.stability || 0, ladder);
    const wasOverdue = new Date(card.nextReviewDate) < now;
    
    return {
      mode: 'TEST_PREP' as const,
      testDate,
      schedule,
      currentStep: closestStep,
      nextReviewDate: wasOverdue ? now : new Date(card.nextReviewDate),
      mastery: (card.lapses || 0) >= MASTERY_THRESHOLDS.lapsesForStruggling
        ? 'STRUGGLING' as const
        : closestStep >= MASTERY_STEP_THRESHOLD
        ? 'MASTERED' as const
        : 'LEARNING' as const
    };
  });
}

// ============================================================================
// PART 11: OPTIONAL REVIEW MODE
// ============================================================================

/**
 * Get all cards for optional review (not just due)
 */
export function getOptionalReviewCards(cards: Flashcard[], deckId: string): Flashcard[] {
  const deckCards = cards.filter(c => c.deckId === deckId && !c.leechSuspended);
  
  // Sort: STRUGGLING → LEARNING → MASTERED
  return deckCards.sort((a, b) => {
    const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
    return (masteryOrder[a.mastery] || 1) - (masteryOrder[b.mastery] || 1);
  });
}

/**
 * Review a card in optional mode (doesn't affect schedule)
 */
export function reviewFlashcardOptional(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  // Only update tracking, NOT nextReviewDate
  return {
    reps: (card.reps || 0) + 1,
    lastReview: now,
    lastResponse: rating
  };
}

// ============================================================================
// PART 12: SCHEDULE HEALTH CHECK
// ============================================================================

/**
 * Check for scheduling problems
 */
export function checkScheduleHealth(
  cards: Flashcard[],
  deck: Deck
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const now = new Date();
  
  // Check for cards past test date (TEST_PREP only)
  if (deck.mode === 'TEST_PREP' && deck.testDate) {
    const testDate = new Date(deck.testDate);
    const cardsPastTest = cards.filter(
      c => c.deckId === deck.id && 
           c.learningState === 'GRADUATED' && 
           new Date(c.nextReviewDate) > testDate
    );
    
    if (cardsPastTest.length > 0) {
      warnings.push({
        type: 'CARDS_PAST_TEST',
        count: cardsPastTest.length,
        recommendation: 'Consider using Optional Review Mode to review these cards before test'
      });
    }
  }
  
  // Check for leeches
  const leeches = cards.filter(c => c.deckId === deck.id && c.isLeech && !c.leechSuspended);
  if (leeches.length > 0) {
    warnings.push({
      type: 'LEECH_DETECTED',
      count: leeches.length,
      recommendation: 'These cards need to be edited, simplified, or suspended'
    });
  }
  
  // Check for overdue cards
  const overdueCards = cards.filter(c => {
    if (c.deckId !== deck.id) return false;
    const dueDate = new Date(c.nextReviewDate);
    const daysDue = daysBetween(dueDate, now);
    return dueDate < now && daysDue > 7;
  });
  
  if (overdueCards.length > 0) {
    warnings.push({
      type: 'OVERDUE_CARDS',
      count: overdueCards.length,
      recommendation: 'You have cards overdue by more than a week'
    });
  }
  
  return warnings;
}

// ============================================================================
// PART 13: INTERVAL PREVIEW
// ============================================================================

export interface IntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

/**
 * Format interval to human-readable string
 */
function formatInterval(days: number): string {
  if (days < 1) {
    const hours = days * 24;
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${Math.max(1, minutes)}m`;
    }
    return `${Math.round(hours)}h`;
  } else if (days < 7) {
    return `${Math.round(days)}d`;
  } else if (days < 30) {
    return `${Math.round(days / 7)}w`;
  } else if (days < 365) {
    return `${Math.round(days / 30)}mo`;
  } else {
    return `${Math.round(days / 365)}y`;
  }
}

/**
 * Format seconds to human-readable string
 */
function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.round(seconds / 3600)}h`;
  } else {
    return `${Math.round(seconds / 86400)}d`;
  }
}

/**
 * Get interval previews for all ratings
 */
export function getIntervalPreviews(card: Flashcard): IntervalPreview {
  // Check learning state first
  if (card.learningState !== 'GRADUATED') {
    return getLearningIntervalPreviews(card);
  }
  
  // Graduated cards - route by mode
  if (card.mode === "LONG_TERM") {
    return getLongTermIntervalPreviews(card);
  } else {
    return getTestPrepIntervalPreviews(card);
  }
}

function getLearningIntervalPreviews(card: Flashcard): IntervalPreview {
  const steps = card.learningSteps || LEARNING_STEPS;
  const currentStep = card.learningStep || 0;
  
  // AGAIN: First step
  const againInterval = formatSeconds(steps[0]);
  
  // HARD: Average or 1.5x
  let hardSeconds: number;
  if (currentStep === 0 && steps.length > 1) {
    hardSeconds = Math.round((steps[0] + steps[1]) / 2);
  } else {
    hardSeconds = Math.round(steps[currentStep] * 1.5);
  }
  const hardInterval = formatSeconds(hardSeconds);
  
  // GOOD: Next step or graduate
  let goodInterval: string;
  if (currentStep < steps.length - 1) {
    goodInterval = formatSeconds(steps[currentStep + 1]);
  } else {
    goodInterval = "Grad";  // Will graduate
  }
  
  // EASY: Graduate
  const easyInterval = "Grad";
  
  return {
    again: againInterval,
    hard: hardInterval,
    good: goodInterval,
    easy: easyInterval
  };
}

function getTestPrepIntervalPreviews(card: Flashcard): IntervalPreview {
  const today = startOfDay(new Date());
  const testDate = card.testDate 
    ? (card.testDate instanceof Date ? card.testDate : new Date(card.testDate))
    : addDays(today, 30);

  const currentStep = card.currentStep || 0;
  const schedule = card.schedule?.length ? card.schedule : generateSchedule(testDate);

  const againInterval = "10m";  // Relearning step
  const hardInterval = "1d";

  const goodStep = Math.min(schedule.length - 1, currentStep + 1);
  const goodInterval = formatInterval(schedule[goodStep]);

  let easyInterval: string;
  if (currentStep < 2) {
    easyInterval = goodInterval;
  } else {
    const easyStep = Math.min(schedule.length - 1, currentStep + 2);
    easyInterval = formatInterval(schedule[easyStep]);
  }

  return { again: againInterval, hard: hardInterval, good: goodInterval, easy: easyInterval };
}

function getLongTermIntervalPreviews(card: Flashcard): IntervalPreview {
  const now = new Date();
  const lastReviewDate = card.lastReview || card.last_review;
  
  const fsrsCard: FSRSCard = {
    due: new Date(card.nextReviewDate),
    stability: card.stability || 0,
    difficulty: card.difficulty || 5,
    elapsed_days: lastReviewDate ? daysBetween(new Date(lastReviewDate), now) : 0,
    scheduled_days: card.stability || 0,
    reps: card.reps || 0,
    state: card.state || State.Review,
    last_review: lastReviewDate ? new Date(lastReviewDate) : undefined,
    lapses: card.lapses || 0,
    learning_steps: 0,
  };

  const schedulingCards = fsrs.repeat(fsrsCard, now);

  const againDays = (schedulingCards[FSRSRating.Again].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const hardDays = (schedulingCards[FSRSRating.Hard].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const goodDays = (schedulingCards[FSRSRating.Good].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const easyDays = (schedulingCards[FSRSRating.Easy].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return {
    again: againDays < 0.01 ? "10m" : formatInterval(againDays),
    hard: formatInterval(Math.max(0.01, hardDays)),
    good: formatInterval(Math.max(0.01, goodDays)),
    easy: formatInterval(Math.max(0.01, easyDays)),
  };
}

// ============================================================================
// PART 14: LEGACY COMPATIBILITY
// ============================================================================

/**
 * Get mastery level for a card
 */
export const getMastery = (card: Flashcard): MasteryLevel => {
  return card.mastery || 'LEARNING';
};

/**
 * Get initial FSRS params for migration
 */
export const getInitialFSRSParams = (
  mastery: MasteryLevel | undefined
) => {
  switch (mastery) {
    case "MASTERED":
      return { state: FSRSState.Review, stability: 14, difficulty: 5 };
    case "LEARNING":
      return { state: FSRSState.Learning, stability: 2, difficulty: 6 };
    default:
      return { state: FSRSState.New, stability: 0, difficulty: 8 };
  }
};
