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
  ScheduleWarning,
  ExamPhase
} from "../types/flashcard";
import { getExamPhase, getExamPhaseCards } from "./examScheduler";
import { 
  calculateOptimalReviewTime, 
  projectRetrievabilityAtDate,
  sortByRAtExam,
  applyTriangularFuzz as applyTriangularFuzzFromRetrievability 
} from "./retrievability";

// ============================================================================
// PART 1: CONSTANTS
// ============================================================================

// ============================================================================
// LEARNING PHASE CONSTANTS
// ============================================================================

/** 
 * Single 10-minute learning step (FSRS-optimized)
 * Research: Graduate cards quickly so FSRS can take control
 */
export const LEARNING_STEPS = [600];  // 10 minutes in seconds

/**
 * Relearning steps for LAPSED cards
 * [600] = 10 minutes (in SECONDS)
 */
export const RELEARNING_STEPS = [600];

/** Interval after graduating via Good button (in days) */
export const GRADUATING_INTERVAL = 1;

/** Interval after graduating via Easy button (in days) */
export const EASY_INTERVAL = 4;

/**
 * Learn ahead limit - show cards early if queue empty
 * Cards can be shown up to 20 minutes early if nothing else to study
 */
export const LEARN_AHEAD_LIMIT = 1200;  // 20 minutes in seconds

/** @deprecated Use LEARN_AHEAD_LIMIT instead */
export const EARLY_REVIEW_BUFFER_SECONDS = LEARN_AHEAD_LIMIT;

/**
 * Day boundary hour (4 AM)
 * All INTERDAY cards normalize to 4 AM
 */
export const DAY_BOUNDARY_HOUR = 4;

// ============================================================================
// EASE FACTOR CONSTANTS
// ============================================================================

/** Starting Ease Factor for new cards (250%) */
export const STARTING_EASE = 2.5;

/** Minimum Ease Factor (prevents Ease Hell) */
export const EASE_FLOOR = 1.3;

/** Ease penalty for Again on graduated card (-20%) */
export const EASE_PENALTY_AGAIN = 0.20;

/** Ease penalty for Hard on graduated card (-15%) */
export const EASE_PENALTY_HARD = 0.15;

/** Ease bonus for Easy on graduated card (+15%) */
export const EASE_BONUS_EASY = 0.15;

/** Easy bonus multiplier for interval (1.3x) */
export const EASY_BONUS_MULTIPLIER = 1.3;

/** Hard interval multiplier (fixed, not Ease-based) */
export const HARD_INTERVAL_MULTIPLIER = 1.2;

// ============================================================================
// LAPSE CONSTANTS
// ============================================================================

/** 
 * Percentage of interval preserved after lapse (0-1)
 * Default 0% means card resets to relearning
 * Can be set to 0.1-0.2 to preserve some memory strength
 */
export const NEW_INTERVAL_PERCENT = 0.0;

/** 
 * Leech threshold - card is marked as leech when lapses >= 4
 * Research recommends 4 (more aggressive than Anki's 8)
 */
export const LEECH_THRESHOLD = 4;

// ============================================================================
// QUEUE CONSTANTS
// ============================================================================

/** New cards per day limit */
export const NEW_CARDS_PER_DAY = 20;

/** Review cards per day limit (0 = unlimited) */
export const REVIEWS_PER_DAY = 0;

/** New card insertion order */
export type InsertionOrder = 'SEQUENTIAL' | 'RANDOM';
export const DEFAULT_INSERTION_ORDER: InsertionOrder = 'SEQUENTIAL';

// ============================================================================
// TEST_PREP CONSTANTS
// ============================================================================

/**
 * Standard ladder for TEST_PREP mode (intervals in DAYS)
 * 
 * @deprecated This ladder-based approach is replaced by phase-based R_exam scheduling.
 * Kept for backward compatibility with legacy code and optional reviews.
 * New scheduling uses calculateOptimalReviewTime() based on stability and target retention.
 */
export const STANDARD_LADDER = [0, 1, 3, 7, 14, 21, 28, 35, 45, 60];

/**
 * Mastery threshold for TEST_PREP
 * Cards at step >= 8 are considered MASTERED
 */
export const MASTERY_STEP_THRESHOLD = 8;

// ============================================================================
// FUZZ CONSTANTS
// ============================================================================

/**
 * Minimum interval (in DAYS) before applying fuzz
 * UNIFIED for both TEST_PREP and LONG_TERM modes
 */
export const FUZZ_MIN_INTERVAL_DAYS = 2;

// ============================================================================
// MASTERY THRESHOLDS
// ============================================================================

/**
 * Mastery thresholds for LONG_TERM mode
 */
export const MASTERY_THRESHOLDS = {
  stabilityForMastered: 21,  // 3 weeks
  lapsesForStruggling: 2,
};

// ============================================================================
// FSRS CONSTANTS
// ============================================================================

/** Maximum interval cap (in days) */
export const MAXIMUM_INTERVAL = 365;

/** Default desired retention */
export const DEFAULT_RETENTION = 0.90;

/**
 * Minimum intervals for LONG_TERM (FSRS) mode
 * Values in SECONDS for consistency
 */
export const MIN_INTERVALS = {
  again: 60,      // 1 minute
  hard: 300,      // 5 minutes
  good: 600,      // 10 minutes
  easy: 0         // No minimum
};

/** @deprecated Use MIN_INTERVALS instead (values now in seconds) */
export const LONG_TERM_MIN_INTERVALS = {
  again: 60000,     // 1 minute in ms
  hard: 300000,     // 5 minutes in ms
  good: 600000,     // 10 minutes in ms
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
// EASE FACTOR UTILITIES
// ============================================================================

export interface EaseFactorUpdate {
  newEase: number;
  wasFloored: boolean;
}

/**
 * Update ease factor based on rating
 * Applies penalties/bonuses and enforces floor
 */
export function updateEaseFactor(
  currentEase: number,
  rating: ReviewRating
): EaseFactorUpdate {
  let newEase = currentEase;
  
  switch (rating) {
    case 'AGAIN':
      newEase -= EASE_PENALTY_AGAIN;
      break;
    case 'HARD':
      newEase -= EASE_PENALTY_HARD;
      break;
    case 'GOOD':
      // No change
      break;
    case 'EASY':
      newEase += EASE_BONUS_EASY;
      break;
  }
  
  // Apply floor (Ease Hell prevention)
  const wasFloored = newEase < EASE_FLOOR;
  newEase = Math.max(EASE_FLOOR, newEase);
  
  return { newEase, wasFloored };
}

// ============================================================================
// FSRS FORMULAS - STABILITY AND DIFFICULTY
// ============================================================================

/**
 * Calculate retrievability using FSRS power law (inline version)
 * 
 * Formula: R(t) = (1 + factor × t/S)^(-power)
 * 
 * @param stability - Memory stability in days
 * @param daysSinceReview - Days elapsed since last review
 * @returns Retrievability (0-1)
 */
export function calculateRetrievabilityPowerLaw(
  stability: number,
  daysSinceReview: number
): number {
  const DECAY_FACTOR = 0.5;
  const DECAY_POWER = 0.5;
  
  if (stability <= 0) return 1.0;
  if (daysSinceReview <= 0) return 1.0;
  
  return Math.pow(1 + (DECAY_FACTOR * daysSinceReview / stability), -DECAY_POWER);
}

/**
 * Calculate stability increase factor
 * 
 * Formula: S_inc = e^(w8) × (11 - D) × S^(-w9) × (e^(w10 × (1-R)) - 1)
 * 
 * This formula captures:
 * - Linear damping from difficulty (harder = smaller increase)
 * - Saturation effect (high stability = harder to increase)
 * - Retrievability gain (lower R at review = larger increase)
 * 
 * @param difficulty - Card difficulty (1-10)
 * @param stability - Current stability in days
 * @param retrievability - Retrievability at time of review (0-1)
 * @param params - FSRS parameters array
 * @returns Stability increase factor
 */
export function calculateStabilityIncrease(
  difficulty: number,
  stability: number,
  retrievability: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS
): number {
  const w8 = params[8] || 1.616;
  const w9 = params[9] || 0.1544;
  const w10 = params[10] || 1.0824;
  
  // Clamp inputs
  difficulty = Math.max(1, Math.min(10, difficulty));
  stability = Math.max(0.1, stability);
  retrievability = Math.max(0.01, Math.min(1, retrievability));
  
  const factor1 = Math.exp(w8);
  const factor2 = 11 - difficulty;
  const factor3 = Math.pow(stability, -w9);
  const factor4 = Math.exp(w10 * (1 - retrievability)) - 1;
  
  return factor1 * factor2 * factor3 * factor4;
}

/**
 * Calculate new stability after successful review
 * 
 * Formula: S_new = S × (1 + S_inc)
 * 
 * @param currentStability - Current stability in days
 * @param difficulty - Card difficulty (1-10)
 * @param retrievability - Retrievability at time of review (0-1)
 * @param params - FSRS parameters array
 * @returns New stability in days
 */
export function calculateNewStability(
  currentStability: number,
  difficulty: number,
  retrievability: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS
): number {
  const sInc = calculateStabilityIncrease(
    difficulty,
    currentStability,
    retrievability,
    params
  );
  
  const newStability = currentStability * (1 + sInc);
  
  // Apply maximum interval cap
  return Math.min(MAXIMUM_INTERVAL, newStability);
}

/**
 * Calculate stability after a lapse (AGAIN pressed)
 * 
 * Formula: S_new = w11 × D^(-w12) × ((S+1)^w13 - 1) × e^(w14 × (1-R))
 * 
 * @param difficulty - Card difficulty (1-10)
 * @param stability - Previous stability in days
 * @param retrievability - Retrievability at time of lapse
 * @param params - FSRS parameters array
 * @returns New stability after lapse
 */
export function calculateStabilityAfterLapse(
  difficulty: number,
  stability: number,
  retrievability: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS
): number {
  const w11 = params[11] || 1.9813;
  const w12 = params[12] || 0.0953;
  const w13 = params[13] || 0.2975;
  const w14 = params[14] || 2.2042;
  
  // Clamp inputs
  difficulty = Math.max(1, Math.min(10, difficulty));
  stability = Math.max(0.1, stability);
  retrievability = Math.max(0.01, Math.min(1, retrievability));
  
  const factor1 = w11;
  const factor2 = Math.pow(difficulty, -w12);
  const factor3 = Math.pow(stability + 1, w13) - 1;
  const factor4 = Math.exp(w14 * (1 - retrievability));
  
  const newStability = factor1 * factor2 * factor3 * factor4;
  
  // Apply minimum stability (at least 1 day)
  return Math.max(1, Math.min(MAXIMUM_INTERVAL, newStability));
}

/**
 * Update difficulty with mean reversion
 * 
 * Formula: D_new = w7 × D_default + (1 - w7) × (D - w6 × (grade - 3))
 * 
 * Mean reversion pulls difficulty back toward the default, preventing
 * outliers from permanently skewing the card's scheduling.
 * 
 * @param currentDifficulty - Current difficulty (1-10)
 * @param grade - Rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @param params - FSRS parameters array
 * @param defaultDifficulty - Default difficulty (middle of scale)
 * @returns New difficulty (1-10)
 */
export function updateDifficultyWithMeanReversion(
  currentDifficulty: number,
  grade: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS,
  defaultDifficulty: number = 5
): number {
  const w6 = params[6] || 1.0651;
  const w7 = params[7] || 0.0234;
  
  // Calculate adjusted difficulty
  const adjustedD = currentDifficulty - w6 * (grade - 3);
  
  // Apply mean reversion
  const newD = w7 * defaultDifficulty + (1 - w7) * adjustedD;
  
  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, newD));
}

/**
 * Convert ReviewRating to numeric grade
 * @param rating - Review rating string
 * @returns Numeric grade (1-4)
 */
export function ratingToGrade(rating: ReviewRating): number {
  switch (rating) {
    case 'AGAIN': return 1;
    case 'HARD': return 2;
    case 'GOOD': return 3;
    case 'EASY': return 4;
  }
}

/**
 * Calculate initial difficulty for a new card
 * 
 * Formula: D0 = w4 - e^(w5 × (grade - 1)) + 1
 * 
 * @param firstGrade - First rating on the card (1-4)
 * @param params - FSRS parameters array
 * @returns Initial difficulty (1-10)
 */
export function calculateInitialDifficulty(
  firstGrade: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS
): number {
  const w4 = params[4] || 7.2102;
  const w5 = params[5] || 0.5316;
  
  const d0 = w4 - Math.exp(w5 * (firstGrade - 1)) + 1;
  
  return Math.max(1, Math.min(10, d0));
}

/**
 * Calculate initial stability for a new card
 * 
 * Formula: S0 = w[grade-1] where grade is 1-4
 * 
 * @param firstGrade - First rating on the card (1-4)
 * @param params - FSRS parameters array
 * @returns Initial stability in days
 */
export function calculateInitialStability(
  firstGrade: number,
  params: number[] = DEFAULT_FSRS_PARAMETERS
): number {
  // First 4 parameters are initial stabilities for each grade
  const gradeIndex = Math.max(0, Math.min(3, firstGrade - 1));
  return Math.max(0.1, params[gradeIndex]);
}

// ============================================================================
// LEARNING PHASE UTILITIES
// ============================================================================

/**
 * Calculate Hard interval for learning phase
 * Uses averaging formula per research spec
 */
export function calculateHardIntervalLearning(
  currentStep: number,
  steps: number[]
): number {
  if (currentStep === 0) {
    if (steps.length > 1) {
      // Average of first two steps
      return Math.round((steps[0] + steps[1]) / 2);
    } else {
      // Single step: 1.5× capped at step + 1 day
      const oneDaySeconds = 86400;
      return Math.min(
        Math.round(steps[0] * 1.5),
        steps[0] + oneDaySeconds
      );
    }
  } else {
    // Repeat current step
    return steps[currentStep];
  }
}

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
  
  // HARD: Special logic based on current step (uses research formula)
  if (rating === "HARD") {
    const intervalSeconds = calculateHardIntervalLearning(currentStep, steps);
    const { date, cardType } = calculateNextReviewWithBoundary(now, intervalSeconds);
    
    return {
      learningStep: currentStep,  // Stay on current step
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
 * 
 * Research: 
 * - Good → GRADUATING_INTERVAL (1 day)
 * - Easy → EASY_INTERVAL (4 days)
 * - Initialize Ease Factor at STARTING_EASE (250%)
 */
export function graduateCard(
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date()
): Partial<Flashcard> {
  // Determine graduation interval based on rating
  const intervalDays = rating === "EASY" ? EASY_INTERVAL : GRADUATING_INTERVAL;
  
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
  
  // Call FSRS for initial stability/difficulty (used for future calculations)
  const fsrsRating = rating === "EASY" ? FSRSRating.Easy : FSRSRating.Good;
  const schedulingCards = fsrs.repeat(fsrsCard, now);
  const result = schedulingCards[fsrsRating].card;
  
  // Use explicit interval constants, not FSRS-calculated stability
  const stabilityDays = intervalDays;
  
  if (card.mode === 'TEST_PREP') {
    // TEST_PREP: Use phase-based scheduling
    const testDate = card.testDate instanceof Date 
      ? card.testDate 
      : card.testDate ? new Date(card.testDate) : addDays(now, 30);
    
    const phaseConfig = getExamPhase(testDate);
    const { phase, targetRetention, daysLeft } = phaseConfig;
    
    // Calculate first review interval based on phase
    let nextInterval: number;
    if (phase === 'CRAM' || phase === 'EXAM_DAY') {
      nextInterval = Math.min(1, daysLeft); // 1 day max in cram
    } else if (phase === 'CONSOLIDATION') {
      nextInterval = Math.min(
        Math.max(1, calculateOptimalReviewTime(stabilityDays, targetRetention)),
        daysLeft
      );
    } else {
      // MAINTENANCE
      nextInterval = Math.min(
        Math.max(1, calculateOptimalReviewTime(stabilityDays, 0.75)),
        daysLeft
      );
    }
    
    const nextReview = addDays(startOfDay(now), Math.round(nextInterval));
    
    return {
      learningState: 'GRADUATED',
      learningStep: 0,
      learningCardType: undefined,
      stability: stabilityDays,
      difficulty: result.difficulty,
      easeFactor: STARTING_EASE,  // Initialize Ease Factor
      state: FSRSState.Review,
      mastery: 'LEARNING',
      nextReviewDate: nextReview,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating
    };
  } else {
    // LONG_TERM: Use explicit graduation intervals
    const nextReview = addDays(now, intervalDays);
    
    return {
      learningState: 'GRADUATED',
      learningStep: 0,
      learningCardType: undefined,
      stability: stabilityDays,
      difficulty: result.difficulty,
      easeFactor: STARTING_EASE,  // Initialize Ease Factor
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
 * 
 * @deprecated This ladder-based approach is replaced by phase-based R_exam scheduling.
 * Kept for backward compatibility with optional reviews and mode conversion.
 * New scheduling uses getExamPhase() and calculateOptimalReviewTime() instead.
 */
export const generateSchedule = (testDate: Date): number[] => {
  const today = dateStartOfDay(new Date());
  const daysLeft = differenceInDays(dateStartOfDay(testDate), today);

  if (daysLeft <= 1) {
    return [0];
  }

  // Include intervals up to AND INCLUDING the exam day (<=, not <)
  // This allows scheduling a card for day 7 when test is 7 days away
  return STANDARD_LADDER.filter((interval) => interval <= daysLeft);
};

/**
 * Calculate next review for TEST_PREP card using R_exam-based scheduling
 * 
 * Uses the 3-phase approach from the research:
 * - MAINTENANCE (>30 days): Target R = 75%, schedule based on stability
 * - CONSOLIDATION (7-30 days): Target R ramps 75%→95%, tightening intervals
 * - CRAM (≤7 days): Maximize R at exam, review every 1 day max
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
  
  // Get current exam phase and target retention
  const phaseConfig = getExamPhase(testDate);
  const { phase, targetRetention, daysLeft } = phaseConfig;
  
  // Get card's current stability (use default if new)
  const stability = card.stability || 1;
  
  // AGAIN: Enter relearning phase (same for all phases)
  if (rating === "AGAIN") {
    const newLapses = (card.lapses || 0) + 1;
    
    // Reduce stability on lapse
    const newStability = Math.max(0.5, stability * 0.5);
    
    return {
      learningState: 'RELEARNING',
      learningStep: 0,
      learningSteps: RELEARNING_STEPS,
      learningCardType: 'INTRADAY',
      nextReviewDate: addSeconds(now, RELEARNING_STEPS[0]),
      stability: newStability,
      lapses: newLapses,
      reps: (card.reps || 0) + 1,
      lastReview: now,
      lastResponse: rating,
      mastery: 'STRUGGLING',
      isLeech: newLapses >= LEECH_THRESHOLD
    };
  }
  
  // Calculate interval based on phase
  let baseInterval: number;
  let newStability: number;
  let mastery: MasteryLevel;
  
  if (phase === 'CRAM' || phase === 'EXAM_DAY') {
    // CRAM MODE: Review every day (or sooner) to maximize R at exam
    // Intervals based on rating but capped at daysLeft
    if (rating === 'HARD') {
      baseInterval = Math.min(1, daysLeft);
      newStability = stability; // No change on hard
      mastery = 'STRUGGLING';
    } else if (rating === 'GOOD') {
      baseInterval = Math.min(1, daysLeft); // 1 day max in cram
      newStability = stability * 1.2; // Small boost
      mastery = 'LEARNING';
    } else { // EASY
      baseInterval = Math.min(2, daysLeft); // 2 days max in cram
      newStability = stability * 1.5; // Bigger boost
      mastery = 'MASTERED';
    }
  } else if (phase === 'CONSOLIDATION') {
    // CONSOLIDATION: Use target retention to calculate interval
    // Intervals tighten as exam approaches (targetR: 75% → 95%)
    if (rating === 'HARD') {
      // Shorter interval, no stability change
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability, Math.min(0.90, targetRetention + 0.10)));
      newStability = stability;
      mastery = 'STRUGGLING';
    } else if (rating === 'GOOD') {
      // Standard interval based on target retention
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability * 1.3, targetRetention));
      newStability = stability * 1.3;
      mastery = 'LEARNING';
    } else { // EASY
      // Longer interval, bigger stability boost
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability * 2.0, targetRetention - 0.05));
      newStability = stability * 2.0;
      mastery = 'MASTERED';
    }
    // Cap to not exceed test date
    baseInterval = Math.min(baseInterval, daysLeft);
  } else {
    // MAINTENANCE: Use relaxed 75% target, longer intervals
    if (rating === 'HARD') {
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability, 0.85));
      newStability = stability;
      mastery = 'STRUGGLING';
    } else if (rating === 'GOOD') {
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability * 1.5, 0.75));
      newStability = stability * 1.5;
      mastery = 'LEARNING';
    } else { // EASY
      baseInterval = Math.max(1, calculateOptimalReviewTime(stability * 2.5, 0.70));
      newStability = stability * 2.5;
      mastery = 'MASTERED';
    }
    // Still cap to not exceed test date
    baseInterval = Math.min(baseInterval, daysLeft);
  }
  
  // Apply fuzz and cap to test date
  const fuzzedInterval = applyFuzz(Math.max(1, Math.round(baseInterval)));
  const nextReview = applyDateCap(addDays(today, fuzzedInterval), testDate);
  
  // Calculate projected R at exam for this card after this review
  const rAtExam = projectRetrievabilityAtDate(
    { ...card, lastReview: now, stability: newStability } as Flashcard,
    testDate
  );
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9a42f0d-8709-4111-a8f4-d1e1f419946b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'spacedRepetition.ts:calculateTestPrepReview:PHASE',message:'Phase-based review',data:{cardId:card.id?.slice(0,8),phase,daysLeft,targetRetention,rating,oldStability:stability,newStability,baseInterval,fuzzedInterval,rAtExam},timestamp:Date.now(),sessionId:'debug-session',runId:'phase-based',hypothesisId:'R_EXAM'})}).catch(()=>{});
  // #endregion
  
  return {
    nextReviewDate: nextReview,
    stability: newStability,
    reps: (card.reps || 0) + 1,
    lastReview: now,
    lastResponse: rating,
    mastery,
    rAtExam // Store projected R at exam
  };
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
    state: (card.state ?? State.Review) as unknown as State,
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
    state: result.state as unknown as FSRSState,
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
  // Learning or Relearning phase - treat undefined as LEARNING (new card)
  const learningState = card.learningState || 'LEARNING';
  if (learningState !== 'GRADUATED') {
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
 * Options for getDueCards
 */
export interface GetDueCardsOptions {
  testDayLockoutEnabled?: boolean;
  newCardsLimit?: number;
  reviewsLimit?: number;
  learnAheadSeconds?: number;
  sortByRetrievability?: boolean;
}

/**
 * Calculate retrievability for sorting (inline to avoid circular deps)
 */
function calculateR(card: Flashcard): number {
  if (!card.lastReview || !card.stability || card.stability <= 0) return 1.0;
  
  const lastReviewDate = card.lastReview instanceof Date 
    ? card.lastReview 
    : new Date(card.lastReview);
  
  const diffTime = new Date().getTime() - lastReviewDate.getTime();
  const daysSince = diffTime / (1000 * 60 * 60 * 24);
  
  if (daysSince <= 0) return 1.0;
  
  // Power law: R(t) = (1 + 0.5 × t/S)^(-0.5)
  return Math.pow(1 + (0.5 * daysSince / card.stability), -0.5);
}

/**
 * Get all due cards with proper priority ordering
 * 
 * Priority order (V3 scheduler style):
 * 1. Intraday Learning Cards (exact timestamp, with learn-ahead buffer)
 * 2. Interday Learning Cards (crossed midnight, counts against review limit)
 * 3. Due Review Cards (graduated cards past due)
 * 4. New Cards (limited by newCardsLimit)
 * 
 * Review cards are sorted by retrievability (lowest R first = most urgent)
 */
export function getDueCards(
  allCards: Flashcard[],
  decks: Deck[],
  testDayLockoutEnabled: boolean = true,
  options: GetDueCardsOptions = {}
): Flashcard[] {
  const now = new Date();
  const today = startOfDay(now);
  const learnAhead = options.learnAheadSeconds ?? LEARN_AHEAD_LIMIT;
  const earlyReviewCutoff = addSeconds(now, learnAhead);
  const sortByR = options.sortByRetrievability ?? true;
  
  const intradayLearning: Flashcard[] = [];
  const interdayLearning: Flashcard[] = [];
  const reviewCards: Flashcard[] = [];
  const newCards: Flashcard[] = [];
  
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
    
    // New cards (never reviewed)
    if (card.learningState === 'LEARNING' && (card.reps || 0) === 0) {
      newCards.push(card);
      continue;
    }
    
    // Learning/Relearning cards (in progress)
    if (card.learningState !== 'GRADUATED') {
      const cardDue = new Date(card.nextReviewDate);
      
      // INTERDAY cards: Day-based comparison (crossed midnight)
      if (card.learningCardType === 'INTERDAY') {
        const cardDueDay = startOfDay(cardDue);
        if (cardDueDay.getTime() <= today.getTime()) {
          interdayLearning.push(card);
        }
      } else {
        // INTRADAY or undefined: Exact timestamp with early buffer
        // Default to INTRADAY behavior for learning cards without type set
        if (cardDue.getTime() <= earlyReviewCutoff.getTime()) {
          intradayLearning.push(card);
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
  
  // ============================================
  // SORT EACH CATEGORY
  // ============================================
  
  // 1. Intraday Learning: Sort by due time (soonest first)
  intradayLearning.sort((a, b) => 
    new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
  );
  
  // 2. Interday Learning: Sort by retrievability (lowest R first = most urgent)
  if (sortByR) {
    interdayLearning.sort((a, b) => calculateR(a) - calculateR(b));
  } else {
    interdayLearning.sort((a, b) => {
      const dateCompare = new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
      return (masteryOrder[a.mastery] || 1) - (masteryOrder[b.mastery] || 1);
    });
  }
  
  // 3. Review Cards: Sort by retrievability or R_exam for TEST_PREP
  if (sortByR) {
    // Separate TEST_PREP and LONG_TERM cards for different sorting
    const testPrepCards: Flashcard[] = [];
    const longTermCards: Flashcard[] = [];
    
    reviewCards.forEach(card => {
      const deck = deckMap[card.deckId];
      if (deck?.mode === 'TEST_PREP' && deck.testDate) {
        testPrepCards.push(card);
      } else {
        longTermCards.push(card);
      }
    });
    
    // For TEST_PREP: Sort by R_exam (projected R at exam date) - lowest first
    // This prioritizes cards that will have lowest retention at exam time
    if (testPrepCards.length > 0) {
      // Group by deck to get test dates
      const deckTestDates: Record<string, Date> = {};
      decks.forEach(d => {
        if (d.testDate) {
          deckTestDates[d.id] = new Date(d.testDate);
        }
      });
      
      // Sort by R_exam (lowest first = most urgent for exam)
      testPrepCards.sort((a, b) => {
        const testDateA = deckTestDates[a.deckId] || addDays(new Date(), 30);
        const testDateB = deckTestDates[b.deckId] || addDays(new Date(), 30);
        const rExamA = projectRetrievabilityAtDate(a, testDateA);
        const rExamB = projectRetrievabilityAtDate(b, testDateB);
        return rExamA - rExamB;
      });
    }
    
    // For LONG_TERM: Sort by current R (lowest first)
    longTermCards.sort((a, b) => calculateR(a) - calculateR(b));
    
    // Combine: TEST_PREP first (more urgent due to deadline), then LONG_TERM
    reviewCards.length = 0;
    reviewCards.push(...testPrepCards, ...longTermCards);
  } else {
    reviewCards.sort((a, b) => {
      const masteryOrder = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
      const masteryCompare = (masteryOrder[a.mastery] || 1) - (masteryOrder[b.mastery] || 1);
      if (masteryCompare !== 0) return masteryCompare;
      return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
    });
  }
  
  // 4. New Cards: Sort by creation date (oldest first for SEQUENTIAL)
  newCards.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // ============================================
  // APPLY LIMITS (V3 scheduler behavior)
  // ============================================
  
  // Interday learning counts against review limit
  const reviewLimit = options.reviewsLimit ?? REVIEWS_PER_DAY;
  const reviewBudget = reviewLimit > 0 
    ? Math.max(0, reviewLimit - interdayLearning.length)
    : Infinity;
  const limitedReviews = reviewCards.slice(0, reviewBudget);
  
  // New cards limit
  const newCardsLimit = options.newCardsLimit ?? NEW_CARDS_PER_DAY;
  const limitedNew = newCards.slice(0, newCardsLimit);
  
  // ============================================
  // COMBINE IN STRICT PRIORITY ORDER
  // ============================================
  // 1. Intraday Learning (highest priority - time-sensitive)
  // 2. Interday Learning (crossed midnight, needs review)
  // 3. Due Reviews (graduated cards)
  // 4. New Cards (lowest priority - can wait)
  
  return [
    ...intradayLearning,
    ...interdayLearning,
    ...limitedReviews,
    ...limitedNew
  ];
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
 * Uses phase-based scheduling instead of ladder
 */
export function convertToTestPrep(
  cards: Flashcard[],
  testDate: Date,
  _ladder: number[] = STANDARD_LADDER // Kept for backward compatibility, unused
): Partial<Flashcard>[] {
  const now = new Date();
  const phaseConfig = getExamPhase(testDate);
  const { phase, targetRetention, daysLeft } = phaseConfig;
  
  return cards.map(card => {
    if (card.learningState !== 'GRADUATED') {
      return {
        mode: 'TEST_PREP' as const,
        testDate
      };
    }
    
    const stability = card.stability || 1;
    const wasOverdue = new Date(card.nextReviewDate) < now;
    
    // Calculate next review based on phase
    let nextInterval: number;
    if (phase === 'CRAM' || phase === 'EXAM_DAY') {
      nextInterval = Math.min(1, daysLeft);
    } else if (phase === 'CONSOLIDATION') {
      nextInterval = Math.min(
        Math.max(1, calculateOptimalReviewTime(stability, targetRetention)),
        daysLeft
      );
    } else {
      nextInterval = Math.min(
        Math.max(1, calculateOptimalReviewTime(stability, 0.75)),
        daysLeft
      );
    }
    
    const nextReview = wasOverdue ? now : addDays(now, Math.round(nextInterval));
    
    return {
      mode: 'TEST_PREP' as const,
      testDate,
      nextReviewDate: nextReview,
      mastery: (card.lapses || 0) >= MASTERY_THRESHOLDS.lapsesForStruggling
        ? 'STRUGGLING' as const
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
  // Check learning state first - treat undefined as LEARNING (new card)
  const learningState = card.learningState || 'LEARNING';
  if (learningState !== 'GRADUATED') {
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
  
  // HARD: Use research formula
  const hardSeconds = calculateHardIntervalLearning(currentStep, steps);
  const hardInterval = formatSeconds(hardSeconds);
  
  // GOOD: Next step or graduate with GRADUATING_INTERVAL
  let goodInterval: string;
  if (currentStep < steps.length - 1) {
    goodInterval = formatSeconds(steps[currentStep + 1]);
  } else {
    goodInterval = formatInterval(GRADUATING_INTERVAL);  // Show graduation interval
  }
  
  // EASY: Graduate with EASY_INTERVAL
  const easyInterval = formatInterval(EASY_INTERVAL);
  
  return {
    again: againInterval,
    hard: hardInterval,
    good: goodInterval,
    easy: easyInterval
  };
}

/**
 * Get interval previews for TEST_PREP card based on current exam phase
 * 
 * Shows phase-appropriate intervals:
 * - MAINTENANCE: Longer intervals based on 75% target R
 * - CONSOLIDATION: Medium intervals based on ramping target R
 * - CRAM: Short intervals (1-2 days max)
 */
function getTestPrepIntervalPreviews(card: Flashcard): IntervalPreview {
  const today = startOfDay(new Date());
  const testDate = card.testDate 
    ? (card.testDate instanceof Date ? card.testDate : new Date(card.testDate))
    : addDays(today, 30);

  // Get current exam phase
  const phaseConfig = getExamPhase(testDate);
  const { phase, targetRetention, daysLeft } = phaseConfig;
  
  // Get card's current stability (use default if new)
  const stability = card.stability || 1;
  
  const againInterval = "10m";  // Relearning step (same for all phases)
  
  let hardDays: number;
  let goodDays: number;
  let easyDays: number;
  
  if (phase === 'CRAM' || phase === 'EXAM_DAY') {
    // CRAM MODE: Very short intervals
    hardDays = Math.min(1, daysLeft);
    goodDays = Math.min(1, daysLeft);
    easyDays = Math.min(2, daysLeft);
  } else if (phase === 'CONSOLIDATION') {
    // CONSOLIDATION: Medium intervals based on target R
    hardDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability, Math.min(0.90, targetRetention + 0.10))),
      daysLeft
    );
    goodDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability * 1.3, targetRetention)),
      daysLeft
    );
    easyDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability * 2.0, targetRetention - 0.05)),
      daysLeft
    );
  } else {
    // MAINTENANCE: Longer intervals based on 75% target R
    hardDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability, 0.85)),
      daysLeft
    );
    goodDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability * 1.5, 0.75)),
      daysLeft
    );
    easyDays = Math.min(
      Math.max(1, calculateOptimalReviewTime(stability * 2.5, 0.70)),
      daysLeft
    );
  }
  
  const hardInterval = formatInterval(Math.max(1, Math.round(hardDays)));
  const goodInterval = formatInterval(Math.max(1, Math.round(goodDays)));
  const easyInterval = formatInterval(Math.max(1, Math.round(easyDays)));

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9a42f0d-8709-4111-a8f4-d1e1f419946b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'spacedRepetition.ts:getTestPrepIntervalPreviews:PHASE',message:'Phase-based previews',data:{cardId:card.id?.slice(0,8),phase,daysLeft,targetRetention,stability,hardDays,goodDays,easyDays,hardInterval,goodInterval,easyInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'phase-based',hypothesisId:'R_EXAM'})}).catch(()=>{});
  // #endregion

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
    state: (card.state ?? State.Review) as unknown as State,
    last_review: lastReviewDate ? new Date(lastReviewDate) : undefined,
    lapses: card.lapses || 0,
    learning_steps: 0,
  };

  const schedulingCards = fsrs.repeat(fsrsCard, now);

  const againDays = (schedulingCards[FSRSRating.Again].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const hardDays = (schedulingCards[FSRSRating.Hard].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const goodDays = (schedulingCards[FSRSRating.Good].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const easyDays = (schedulingCards[FSRSRating.Easy].card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9a42f0d-8709-4111-a8f4-d1e1f419946b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'spacedRepetition.ts:getLongTermIntervalPreviews',message:'LONG_TERM mode preview',data:{cardId:card.id?.slice(0,8),stability:card.stability,difficulty:card.difficulty,state:card.state,againDays,hardDays,goodDays,easyDays},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'LONG_TERM'})}).catch(()=>{});
  // #endregion

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
