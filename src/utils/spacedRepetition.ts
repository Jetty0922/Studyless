import {
  addDays,
  startOfDay,
  differenceInDays,
  isAfter,
  subDays,
  isSameDay,
} from "date-fns";
import { Card as FSRSCard, FSRS, Rating, generatorParameters } from "ts-fsrs";
import { Flashcard, ReviewRating, Deck } from "../types/flashcard";

// ============================================================================
// PART 2: TEST PREP LOGIC (The Ladder)
// ============================================================================

const STANDARD_LADDER = [0, 1, 3, 7, 14, 21, 28, 35, 45, 60];

/**
 * Helper Function: The Brick Wall Logic
 * No date can ever go past TestDate - 1.
 */
export const applyDateCap = (calculatedDate: Date, testDate: Date): Date => {
  const wall = subDays(startOfDay(testDate), 1); // Day Before Test
  return isAfter(calculatedDate, wall) ? wall : calculatedDate;
};

/**
 * Initialization Function: generateSchedule(testDate)
 * Logic:
 * - Calc daysLeft. If <= 1, return [0].
 * - Else, filter STANDARD_LADDER keeping only values < daysLeft.
 */
export const generateSchedule = (testDate: Date): number[] => {
  const today = startOfDay(new Date());
  const daysLeft = differenceInDays(startOfDay(testDate), today);

  if (daysLeft <= 1) {
    return [0];
  }

  // Filter STANDARD_LADDER keeping only values < daysLeft
  return STANDARD_LADDER.filter((interval) => interval < daysLeft);
};

/**
 * Button Handler: calculateTestPrepReview(card, rating)
 */
export const calculateTestPrepReview = (
  card: Flashcard,
  rating: ReviewRating,
  now?: Date // Optional time-travel for simulation
): Partial<Flashcard> & { action?: 'REQUEUE', interval?: number } => {
  const today = startOfDay(now || new Date());
  
  // Safety check for testDate - use a far future date as fallback
  if (!card.testDate) {
    console.error("Test Prep card missing testDate - using 30 day fallback", card.id);
    // Fallback: treat as if test is 30 days from now
    card = { ...card, testDate: addDays(today, 30) };
  }

  // Ensure testDate is a Date object (may be string from storage)
  // At this point card.testDate is guaranteed to exist due to fallback above
  const testDate = card.testDate instanceof Date 
    ? card.testDate 
    : new Date(card.testDate!);

  // CASE: "AGAIN"
  if (rating === "AGAIN") {
    // Do not save to DB (handled by store returning early/not syncing).
    // Return instructions for local session update only.
    // In this implementation, we return the update object, and the store decides whether to persist.
    // For AGAIN, the spec says "Requeue".
    return {
      action: 'REQUEUE',
      lastResponse: "AGAIN",
      againCount: (card.againCount || 0) + 1,
      // We don't change nextReviewDate here because it's a session requeue?
      // Or we set it to today? Usually today for immediate review.
      nextReviewDate: today, 
    };
  }

  // Common vars
  const currentStep = card.currentStep || 0;
  const schedule = card.schedule && card.schedule.length > 0 ? card.schedule : generateSchedule(testDate);
  let newStep = currentStep;
  let interval = 0;
  let nextReviewDate = today;
  let mastery: 'LEARNING' | 'STRUGGLING' | 'MASTERED' = card.mastery || 'LEARNING';

  // CASE: "HARD" (Struggle)
  if (rating === "HARD") {
    newStep = Math.max(0, currentStep - 1); // Regress 1
    interval = 1; // 1 day (Always)
    nextReviewDate = applyDateCap(addDays(today, 1), testDate);
    mastery = "STRUGGLING";
  }
  // CASE: "GOOD" (Standard)
  else if (rating === "GOOD") {
    newStep = currentStep + 1;
    if (newStep >= schedule.length) {
      // Check Ladder End
      nextReviewDate = subDays(startOfDay(testDate), 1);
      mastery = "MASTERED";
    } else {
      interval = schedule[newStep];
      nextReviewDate = applyDateCap(addDays(today, interval), testDate);
      mastery = "LEARNING";
    }
  }
  // CASE: "EASY" (Skip)
  else if (rating === "EASY") {
    // Guardrail: IF card.currentStep < 2 -> Treat as "GOOD" (Block skip)
    if (currentStep < 2) {
        // Treat as GOOD
        newStep = currentStep + 1;
        if (newStep >= schedule.length) {
            nextReviewDate = subDays(startOfDay(testDate), 1);
            mastery = "MASTERED";
        } else {
            interval = schedule[newStep];
            nextReviewDate = applyDateCap(addDays(today, interval), testDate);
            mastery = "LEARNING";
        }
    } else {
        // Actual EASY logic
        newStep = currentStep + 2; // Skip 1
        if (newStep >= schedule.length) {
            nextReviewDate = subDays(startOfDay(testDate), 1);
            mastery = "MASTERED";
        } else {
            interval = schedule[newStep];
            nextReviewDate = applyDateCap(addDays(today, interval), testDate);
            mastery = "LEARNING";
        }
    }
  }

  return {
    currentStep: newStep,
    nextReviewDate,
    mastery,
    lastResponse: rating,
    last_review: today, // Track when this card was last reviewed
    schedule, // Return schedule in case it was generated
    interval // Return interval for simulator visibility
  };
};

// ============================================================================
// PART 3: LONG TERM LOGIC (FSRS Integration) - Clean Architecture
// ============================================================================

// --- CONFIGURATION ---
// Minimum intervals to prevent cards from appearing due immediately after review
// FSRS can schedule very short intervals (seconds) for new/learning cards
export const LONG_TERM_MIN_INTERVALS = {
  again: 0,                   // Immediately due (can continue session)
  hard: 5 * 60 * 1000,       // 5 minutes
  good: 10 * 60 * 1000,      // 10 minutes
  easy: 0,                    // No minimum (FSRS usually gives days)
} as const;

// Default values for new LONG_TERM cards
export const LONG_TERM_DEFAULTS = {
  state: 0,        // New
  stability: 0,    // FSRS calculates on first review
  difficulty: 5,   // Average baseline (scale 1-10)
  lapses: 0,
  reps: 0,
} as const;

// Mastery thresholds
const MASTERY_THRESHOLDS = {
  stabilityForMastered: 21,  // 3 weeks stability = MASTERED
  lapsesForStruggling: 2,    // 2+ lapses = STRUGGLING
} as const;

// Initialize FSRS with FSRS-5 weights, tuned for daily students
const fsrs = new FSRS(generatorParameters({
  maximum_interval: 365,   // Cap at 1 year
  request_retention: 0.90, // 90% retention - balanced for daily study
  w: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
    1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407,
    2.9466, 0.5034, 0.6567
  ]
}));

// --- HELPER: Build FSRS Card Object ---
// Centralized to eliminate duplication between review and preview functions
function buildFSRSCard(card: Flashcard, now: Date): FSRSCard {
  const dueDate = card.nextReviewDate instanceof Date 
    ? card.nextReviewDate 
    : new Date(card.nextReviewDate);
  const lastReviewDate = card.last_review 
    ? (card.last_review instanceof Date ? card.last_review : new Date(card.last_review))
    : undefined;

  return {
    due: dueDate,
    stability: card.stability ?? LONG_TERM_DEFAULTS.stability,
    difficulty: card.difficulty ?? LONG_TERM_DEFAULTS.difficulty,
    elapsed_days: lastReviewDate ? differenceInDays(now, lastReviewDate) : 0,
    scheduled_days: lastReviewDate ? differenceInDays(dueDate, lastReviewDate) : 0,
    reps: card.reps ?? LONG_TERM_DEFAULTS.reps,
    state: card.state ?? LONG_TERM_DEFAULTS.state,
    last_review: lastReviewDate,
    lapses: card.lapses ?? LONG_TERM_DEFAULTS.lapses,
    learning_steps: 0,
  };
}

// --- SINGLE SOURCE OF TRUTH: Mastery Calculation ---
/**
 * Calculate mastery for a LONG_TERM card based on FSRS state.
 * This is THE definition used everywhere in the app.
 * 
 * @param card - The flashcard (or partial with state, stability, lapses)
 * @returns "LEARNING" | "STRUGGLING" | "MASTERED"
 * 
 * Rules:
 * - STRUGGLING: Relearning state (3) OR 2+ lapses
 * - MASTERED: Review state (2) AND stability >= 21 days
 * - LEARNING: Everything else (New, Learning, or early Review)
 */
export function getMastery(card: Pick<Flashcard, 'state' | 'stability' | 'lapses'>): "LEARNING" | "STRUGGLING" | "MASTERED" {
  const state = card.state ?? 0;
  const stability = card.stability ?? 0;
  const lapses = card.lapses ?? 0;

  // STRUGGLING: Relearning (forgot it) OR high lapse count
  if (state === 3 || lapses >= MASTERY_THRESHOLDS.lapsesForStruggling) {
    return "STRUGGLING";
  }

  // MASTERED: Review state with long-term stability
  if (state === 2 && stability >= MASTERY_THRESHOLDS.stabilityForMastered) {
    return "MASTERED";
  }

  // LEARNING: Everything else (New=0, Learning=1, or Review with low stability)
  return "LEARNING";
}

// --- FACTORY: Create New LONG_TERM Card Fields ---
/**
 * Returns the FSRS fields for a brand new LONG_TERM card.
 * Used by flashcardStore.addFlashcard and addFlashcardsBatch.
 */
export function createNewLongTermCard(): {
  mode: "LONG_TERM";
  state: number;
  stability: number;
  difficulty: number;
  lapses: number;
  reps: number;
  mastery: "LEARNING";
  nextReviewDate: Date;
} {
  return {
    mode: "LONG_TERM",
    state: LONG_TERM_DEFAULTS.state,
    stability: LONG_TERM_DEFAULTS.stability,
    difficulty: LONG_TERM_DEFAULTS.difficulty,
    lapses: LONG_TERM_DEFAULTS.lapses,
    reps: LONG_TERM_DEFAULTS.reps,
    mastery: "LEARNING",
    nextReviewDate: new Date(), // Due immediately
  };
}

// --- MIGRATION: Convert TEST_PREP Card to LONG_TERM ---
/**
 * Converts a TEST_PREP card to LONG_TERM mode.
 * Uses the card's existing mastery to seed initial FSRS values.
 * 
 * @param card - The TEST_PREP card to convert
 * @param now - Current date (for setting last_review)
 * @returns Partial flashcard updates for LONG_TERM mode
 */
export function convertCardToLongTerm(
  card: Flashcard,
  now: Date = new Date()
): Partial<Flashcard> {
  // Map TEST_PREP mastery to initial FSRS params
  let initialState: number;
  let initialStability: number;
  let initialDifficulty: number;

  switch (card.mastery) {
    case "MASTERED":
      initialState = 2;        // Review state
      initialStability = 21;   // 3 weeks
      initialDifficulty = 5;   // Average
      break;
    case "LEARNING":
      initialState = 1;        // Learning state
      initialStability = 3;    // 3 days
      initialDifficulty = 5;   // Average
      break;
    case "STRUGGLING":
    default:
      initialState = 0;        // New state (will re-learn)
      initialStability = 0;    // FSRS will calculate
      initialDifficulty = 7;   // Slightly harder
      break;
  }

  // Calculate next review based on initial stability
  const nextReviewDate = initialStability > 0
    ? addDays(now, initialStability)
    : now; // Due immediately if no stability

  return {
    mode: "LONG_TERM",
    state: initialState,
    stability: initialStability,
    difficulty: initialDifficulty,
    lapses: 0,
    reps: 0,
    last_review: now,
    nextReviewDate,
    mastery: getMastery({ state: initialState, stability: initialStability, lapses: 0 }),
    // Clear TEST_PREP fields
    testDate: undefined,
    schedule: undefined,
    currentStep: undefined,
  };
}

// --- REVIEW: Calculate LONG_TERM Review Result ---
/**
 * Calculate the next state for a LONG_TERM card after a review.
 * Uses ts-fsrs algorithm with minimum interval enforcement.
 */
export const calculateLongTermReview = (
  card: Flashcard,
  rating: ReviewRating,
  nowOverride?: Date
): Partial<Flashcard> => {
  const now = nowOverride || new Date();
  
  // Map app rating to FSRS rating
  let fsrsRating: Rating;
  switch (rating) {
    case "AGAIN": fsrsRating = Rating.Again; break;
    case "HARD": fsrsRating = Rating.Hard; break;
    case "GOOD": fsrsRating = Rating.Good; break;
    case "EASY": fsrsRating = Rating.Easy; break;
  }

  // Build FSRS card and run algorithm
  const fCard = buildFSRSCard(card, now);
  const schedulingCards = fsrs.repeat(fCard, now);
  const result = schedulingCards[fsrsRating].card;

  // Apply minimum intervals based on rating
  let minIntervalMs: number;
  switch (fsrsRating) {
    case Rating.Again: minIntervalMs = LONG_TERM_MIN_INTERVALS.again; break;
    case Rating.Hard: minIntervalMs = LONG_TERM_MIN_INTERVALS.hard; break;
    case Rating.Good: minIntervalMs = LONG_TERM_MIN_INTERVALS.good; break;
    case Rating.Easy: minIntervalMs = LONG_TERM_MIN_INTERVALS.easy; break;
    default: minIntervalMs = 0;
  }

  const fsrsIntervalMs = result.due.getTime() - now.getTime();
  const actualIntervalMs = Math.max(fsrsIntervalMs, minIntervalMs);
  const nextReviewDate = new Date(now.getTime() + actualIntervalMs);

  // Calculate mastery using single source of truth
  const mastery = getMastery({
    state: result.state,
    stability: result.stability,
    lapses: result.lapses,
  });

  return {
    state: result.state,
    stability: result.stability,
    difficulty: result.difficulty,
    nextReviewDate,
    last_review: now,
    lastResponse: rating,
    reps: result.reps,
    lapses: result.lapses,
    mastery,
  };
};

// ============================================================================
// PART 4: INTERVAL PREVIEW (For UI Display)
// ============================================================================

export interface IntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

/**
 * Format interval in days to human-readable string
 */
function formatInterval(days: number): string {
  if (days < 1) {
    // Less than a day - show in minutes or hours
    const hours = days * 24;
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    return `${Math.round(hours)}h`;
  } else if (days < 7) {
    return `${Math.round(days)}d`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}w`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  } else {
    const years = Math.round(days / 365);
    return `${years}y`;
  }
}

/**
 * Preview intervals for all ratings without applying them
 * Used to display interval hints on rating buttons
 */
export function getIntervalPreviews(card: Flashcard): IntervalPreview {
  // Default to TEST_PREP if mode is undefined (handles cards without mode column)
  if (card.mode === "LONG_TERM") {
    return getLongTermIntervalPreviews(card);
  } else {
    // TEST_PREP or undefined defaults to TEST_PREP
    return getTestPrepIntervalPreviews(card);
  }
}

function getTestPrepIntervalPreviews(card: Flashcard): IntervalPreview {
  // Ensure testDate is a Date object - fallback to 30 days from now
  const today = startOfDay(new Date());
  const testDate = card.testDate 
    ? (card.testDate instanceof Date ? card.testDate : new Date(card.testDate))
    : addDays(today, 30); // Fallback

  const currentStep = card.currentStep || 0;
  const schedule = card.schedule && card.schedule.length > 0 
    ? card.schedule 
    : generateSchedule(testDate);

  // AGAIN: Requeue in session (show as "Now" or short time)
  const againInterval = "Now";

  // HARD: Always 1 day
  const hardInterval = "1d";

  // GOOD: Next step in schedule
  const goodStep = currentStep + 1;
  let goodInterval: string;
  if (goodStep >= schedule.length) {
    // End of ladder - next review is day before test
    const today = startOfDay(new Date());
    const dayBeforeTest = subDays(startOfDay(testDate), 1);
    const daysUntil = differenceInDays(dayBeforeTest, today);
    goodInterval = daysUntil <= 0 ? "Now" : formatInterval(daysUntil);
  } else {
    goodInterval = formatInterval(schedule[goodStep]);
  }

  // EASY: Skip step (or treated as GOOD if step < 2)
  let easyInterval: string;
  if (currentStep < 2) {
    // Blocked - treated as GOOD
    easyInterval = goodInterval;
  } else {
    const easyStep = currentStep + 2;
    if (easyStep >= schedule.length) {
      const today = startOfDay(new Date());
      const dayBeforeTest = subDays(startOfDay(testDate), 1);
      const daysUntil = differenceInDays(dayBeforeTest, today);
      easyInterval = daysUntil <= 0 ? "Now" : formatInterval(daysUntil);
    } else {
      easyInterval = formatInterval(schedule[easyStep]);
    }
  }

  return {
    again: againInterval,
    hard: hardInterval,
    good: goodInterval,
    easy: easyInterval,
  };
}

function getLongTermIntervalPreviews(card: Flashcard): IntervalPreview {
  const now = new Date();
  
  // Use centralized FSRS card builder
  const fCard = buildFSRSCard(card, now);
  const schedulingCards = fsrs.repeat(fCard, now);

  // Calculate intervals with minimum enforcement (same as calculateLongTermReview)
  // Note: "Again" is always "Now" so we skip calculating it
  const hardFsrsMs = schedulingCards[Rating.Hard].card.due.getTime() - now.getTime();
  const goodFsrsMs = schedulingCards[Rating.Good].card.due.getTime() - now.getTime();
  const easyFsrsMs = schedulingCards[Rating.Easy].card.due.getTime() - now.getTime();

  // Apply minimums using shared config
  const hardMs = Math.max(hardFsrsMs, LONG_TERM_MIN_INTERVALS.hard);
  const goodMs = Math.max(goodFsrsMs, LONG_TERM_MIN_INTERVALS.good);
  const easyMs = Math.max(easyFsrsMs, LONG_TERM_MIN_INTERVALS.easy);

  // Convert to days for formatting
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const hardDays = hardMs / MS_PER_DAY;
  const goodDays = goodMs / MS_PER_DAY;
  const easyDays = easyMs / MS_PER_DAY;

  return {
    again: "Now",
    hard: formatInterval(Math.max(0.0035, hardDays)),
    good: formatInterval(Math.max(0.007, goodDays)),
    easy: formatInterval(Math.max(0.01, easyDays)),
  };
}

// ============================================================================
// PART 5: SESSION CONTROLLER (The Query)
// ============================================================================

/**
 * Helper to check if a deck is in Final Review Mode (Day Before Test)
 */
export const isFinalReviewDay = (testDate: Date): boolean => {
  const today = startOfDay(new Date());
  const dayBefore = subDays(startOfDay(testDate), 1);
  return isSameDay(today, dayBefore);
};

/**
 * Helper to check if a deck is in Test Day Lockout (Test Day)
 */
export const isTestDay = (testDate: Date): boolean => {
  const today = startOfDay(new Date());
  return isSameDay(today, startOfDay(testDate));
};

/**
 * Main Handle Review Function
 * Checks mode and routes to correct logic.
 */
export const handleReview = (
  card: Flashcard,
  rating: ReviewRating
): Partial<Flashcard> | null => {
  if (card.mode === "TEST_PREP") {
    return calculateTestPrepReview(card, rating);
  } else {
    return calculateLongTermReview(card, rating);
  }
};

/**
 * Function: getDueCards
 * Implements Final Review Check, Test Day Lockout, Standard Review, Weekend Warrior Fix.
 * 
 * IMPORTANT: LONG_TERM mode uses exact timestamp comparison because FSRS schedules 
 * with specific times (minutes/hours). TEST_PREP uses day-based comparison.
 */
export function getDueCards(
  allCards: Flashcard[], 
  decks: Deck[]
): Flashcard[] {
  const now = new Date(); // Current exact time for LONG_TERM comparisons
  const today = startOfDay(now); // Start of day for TEST_PREP comparisons
  let dueCards: Flashcard[] = [];

  // Group cards by deck for efficiency
  const cardsByDeck: Record<string, Flashcard[]> = {};
  allCards.forEach(c => {
    if (!cardsByDeck[c.deckId]) cardsByDeck[c.deckId] = [];
    cardsByDeck[c.deckId].push(c);
  });

  decks.forEach(deck => {
    // Handle LONG_TERM mode - uses FSRS logic with exact timestamp comparison
    // FSRS can schedule cards with specific times (e.g., "due in 14 minutes")
    // so we must compare actual timestamps, not just dates
    if (deck.mode === 'LONG_TERM') {
      const deckCards = cardsByDeck[deck.id] || [];
      const standardDue = deckCards.filter(c => {
        // Use exact timestamp comparison for FSRS - cards are only due when their time has passed
        const reviewDate = new Date(c.nextReviewDate);
        return reviewDate <= now;
      });
      dueCards = dueCards.concat(standardDue);
      return;
    }
    
    // TEST_PREP mode (default if mode is undefined)
    // Uses day-based comparison since TEST_PREP schedules in whole days
    // If no testDate, still include cards that are due
    if (!deck.testDate) {
      const deckCards = cardsByDeck[deck.id] || [];
      const standardDue = deckCards.filter(c => {
        const reviewDate = startOfDay(new Date(c.nextReviewDate));
        return reviewDate <= today;
      });
      dueCards = dueCards.concat(standardDue);
      return;
    }
    
    const deckTestDate = startOfDay(new Date(deck.testDate));
    const deckCards = cardsByDeck[deck.id] || [];

    // Test Day Lockout: IF today == deck.testDate: Return empty list (No reviews allowed).
    if (isSameDay(today, deckTestDate)) {
      return; // Skip this deck entirely
    }

    // Final Review Check: IF today == (deck.testDate - 1)
    if (isSameDay(today, subDays(deckTestDate, 1))) {
      // Fetch ALL cards in deck (Ignore nextReviewDate).
      // Sort: STRUGGLING first, then LEARNING.
      const sorted = [...deckCards].sort((a, b) => {
        const scoreA = a.mastery === 'STRUGGLING' ? 0 : a.mastery === 'LEARNING' ? 1 : 2;
        const scoreB = b.mastery === 'STRUGGLING' ? 0 : b.mastery === 'LEARNING' ? 1 : 2;
        return scoreA - scoreB;
      });
      dueCards = dueCards.concat(sorted);
      return;
    }

    // Standard Review: Fetch cards where nextReviewDate <= today.
    // Weekend Warrior Fix: Do NOT check lastResponseDate.
    const standardDue = deckCards.filter(c => {
      // Handle both Date objects and ISO strings from storage
      const reviewDate = startOfDay(new Date(c.nextReviewDate));
      return reviewDate <= today;
    });
    dueCards = dueCards.concat(standardDue);
  });

  return dueCards;
}
