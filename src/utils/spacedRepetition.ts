import {
  addDays,
  startOfDay,
  differenceInDays,
  isAfter,
  subDays,
  parseISO,
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
    schedule, // Return schedule in case it was generated
    interval // Return interval for simulator visibility
  };
};

// ============================================================================
// PART 3: LONG TERM LOGIC (FSRS Integration)
// ============================================================================

// Initialize FSRS with FSRS-5 weights, tuned for average students
// - Uses official FSRS-5 research weights for proper exponential growth
// - request_retention: 0.92 (slightly conservative for casual learners)
// - maximum_interval: 365 days (1 year cap for peace of mind)
const fsrs = new FSRS(generatorParameters({
  maximum_interval: 365,   // Cap at 1 year (reassuring for average users)
  request_retention: 0.92, // 92% retention = ~25% shorter intervals than default
  w: [
    0.4072,  // w0:  Initial stability for 'Again'
    1.1829,  // w1:  Initial stability for 'Hard'
    3.1262,  // w2:  Initial stability for 'Good'
    15.4722, // w3:  Initial stability for 'Easy'
    7.2102,  // w4:  Difficulty baseline
    0.5316,  // w5:  Stability increment multiplier (KEY: enables ~2.5x growth)
    1.0651,  // w6:  Difficulty influence on stability increase
    0.0234,  // w7:  Stability saturation (KEY: near 0 = true exponential)
    1.616,   // w8:  Retrievability influence (rewards difficult recalls)
    0.1544,  // w9:  Hard penalty factor
    1.0824,  // w10: Lapse stability decay
    1.9813,  // w11: Lapse difficulty increase
    0.0953,  // w12: Lapse short-term stability
    0.2975,  // w13: Lapse retrievability factor
    2.2042,  // w14: Difficulty ceiling factor
    0.2407,  // w15: Difficulty floor factor
    2.9466,  // w16: Stability recovery base
    0.5034,  // w17: Stability recovery modifier
    0.6567   // w18: Forgetting curve shape
  ]
}));

/**
 * Migration Logic Helpers
 * (Actual iteration is in store)
 */
export const getInitialFSRSParams = (
  mastery: 'LEARNING' | 'STRUGGLING' | 'MASTERED' | undefined
) => {
  switch (mastery) {
    case "MASTERED":
      return { state: 2, stability: 7, difficulty: 5 }; // Review (Lowered from 15)
    case "LEARNING":
      return { state: 1, stability: 1, difficulty: 6 };  // Learning (Lowered from 3)
    default: // STRUGGLING or NULL
      return { state: 0, stability: 0, difficulty: 8 };  // New
  }
};

/**
 * Button Handler: calculateLongTermReview(card, rating)
 * Logic: Strictly use ts-fsrs.
 */
export const calculateLongTermReview = (
  card: Flashcard,
  rating: ReviewRating,
  nowStr?: Date // Optional time-travel for simulation
): Partial<Flashcard> => {
  const now = nowStr || new Date(); // FSRS uses specific time
  
  // Map Rating: AGAIN->1, HARD->2, GOOD->3, EASY->4
  let fsrsRating: Rating;
  switch (rating) {
    case "AGAIN": fsrsRating = Rating.Again; break;
    case "HARD": fsrsRating = Rating.Hard; break;
    case "GOOD": fsrsRating = Rating.Good; break;
    case "EASY": fsrsRating = Rating.Easy; break;
  }

  // Ensure dates are Date objects (they may be strings from storage)
  const dueDate = card.nextReviewDate instanceof Date 
    ? card.nextReviewDate 
    : new Date(card.nextReviewDate);
  const lastReviewDate = card.last_review 
    ? (card.last_review instanceof Date ? card.last_review : new Date(card.last_review))
    : undefined;

  // Construct FSRS Card object
  const fCard: FSRSCard = {
    due: dueDate,
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: lastReviewDate 
      ? differenceInDays(now, lastReviewDate) 
      : 0,
    scheduled_days: lastReviewDate
      ? differenceInDays(dueDate, lastReviewDate)
      : 0,
    reps: card.reps || 0,
    state: card.state || 0,
    last_review: lastReviewDate,
    lapses: card.lapses || 0,
    learning_steps: 0,
  };

  // Run fsrs.repeat
  const schedulingCards = fsrs.repeat(fCard, now);
  
  // Get result for the specific rating
  const result = schedulingCards[fsrsRating].card;

  return {
    state: result.state,
    stability: result.stability,
    difficulty: result.difficulty,
    nextReviewDate: result.due,
    last_review: now,
    lastResponse: rating,
    reps: result.reps,
    lapses: result.lapses,
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
  
  // Ensure dates are Date objects
  const dueDate = card.nextReviewDate instanceof Date 
    ? card.nextReviewDate 
    : new Date(card.nextReviewDate);
  const lastReviewDate = card.last_review 
    ? (card.last_review instanceof Date ? card.last_review : new Date(card.last_review))
    : undefined;

  // Construct FSRS Card object
  const fCard: FSRSCard = {
    due: dueDate,
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: lastReviewDate 
      ? differenceInDays(now, lastReviewDate) 
      : 0,
    scheduled_days: lastReviewDate
      ? differenceInDays(dueDate, lastReviewDate)
      : 0,
    reps: card.reps || 0,
    state: card.state || 0,
    last_review: lastReviewDate,
    lapses: card.lapses || 0,
    learning_steps: 0,
  };

  // Get all scheduling options from FSRS
  const schedulingCards = fsrs.repeat(fCard, now);

  // Calculate intervals in days for each rating
  const againDue = schedulingCards[Rating.Again].card.due;
  const hardDue = schedulingCards[Rating.Hard].card.due;
  const goodDue = schedulingCards[Rating.Good].card.due;
  const easyDue = schedulingCards[Rating.Easy].card.due;

  const againDays = differenceInDays(againDue, now) + (againDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) % 1;
  const hardDays = differenceInDays(hardDue, now) + (hardDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) % 1;
  const goodDays = differenceInDays(goodDue, now) + (goodDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) % 1;
  const easyDays = differenceInDays(easyDue, now) + (easyDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) % 1;

  return {
    again: againDays < 0.01 ? "Now" : formatInterval(againDays),
    hard: formatInterval(Math.max(0.01, hardDays)),
    good: formatInterval(Math.max(0.01, goodDays)),
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
