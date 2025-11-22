import { Flashcard, ReviewRating, Deck } from "../types/flashcard";

/**
 * Calculate the review schedule based on days until test
 * @param daysUntilTest - Number of days from today to test date
 * @returns Array of review intervals (days from today)
 */
export function calculateSchedule(daysUntilTest: number): number[] {
  if (daysUntilTest >= 21) {
    return [0, 1, 3, 7, 14, 21];
  } else if (daysUntilTest >= 14) {
    return [0, 1, 3, 7, 14];
  } else if (daysUntilTest >= 7) {
    return [0, 1, 3, 7];
  } else if (daysUntilTest >= 4) {
    return [0, 1, 3];
  } else if (daysUntilTest >= 2) {
    return [0, 1];
  } else {
    return [0];
  }
}

/**
 * Calculate next review date for TEST_PREP mode
 * @param card - The flashcard being reviewed
 * @param rating - User's rating (again/hard/good/easy)
 * @param testDate - The test date (for capping)
 * @param deck - The deck (for special modes)
 * @returns Updated card properties
 */
export function calculateNextReview(
  card: Flashcard,
  rating: ReviewRating,
  testDate?: Date,
  deck?: Deck
): Pick<
  Flashcard,
  | "nextReviewDate"
  | "currentStep"
  | "againCount"
  | "responseHistory"
  | "priority"
> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let newStep = card.currentStep;
  let nextReviewDate = new Date(now);
  let againCount = card.againCount || 0;
  const priority = card.priority || "NORMAL";

  // Update response history (keep last 5)
  const responseHistory = [...(card.responseHistory || []), rating].slice(-5);

  // Check if in special modes
  const finalReviewMode = deck?.finalReviewMode || false;
  const emergencyMode = deck?.emergencyMode || false;

  // ========== AGAIN RESPONSE ==========
  if (rating === "again") {
    againCount += 1;
    newStep = card.currentStep; // Don't advance

    // In special modes, don't update nextReviewDate
    if (!finalReviewMode && !emergencyMode) {
      // Stay in today's queue for re-review in session
      nextReviewDate = new Date(now);

      // If failed 3+ times and not close to test, postpone to tomorrow
      if (againCount >= 3) {
        const daysUntilTest = testDate
          ? Math.ceil(
              (testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 999;

        if (daysUntilTest > 3) {
          // Not close to test - postpone to tomorrow
          nextReviewDate.setDate(nextReviewDate.getDate() + 1);
        }
        // If close to test (≤3 days), keep in today's queue for user to decide
      }
    }
  }

  // ========== HARD RESPONSE ==========
  else if (rating === "hard") {
    againCount = 0; // Reset again counter
    newStep = card.currentStep; // Don't advance step

    if (!finalReviewMode && !emergencyMode) {
      // Review tomorrow
      nextReviewDate.setDate(nextReviewDate.getDate() + 1);
    }
  }

  // ========== GOOD RESPONSE ==========
  else if (rating === "good") {
    againCount = 0; // Reset again counter
    newStep = card.currentStep + 1; // Advance to next step

    if (!finalReviewMode && !emergencyMode) {
      // Calculate next review date
      if (newStep >= card.schedule.length) {
        // Completed all steps - schedule for final review day
        if (testDate) {
          const finalReviewDay = new Date(testDate);
          finalReviewDay.setDate(finalReviewDay.getDate() - 1);
          nextReviewDate = finalReviewDay;
        } else {
          // No test date - use last interval
          const interval = card.schedule[card.schedule.length - 1];
          nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        }
      } else {
        // Use next interval from schedule
        const interval = card.schedule[newStep];
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        // Cap at final review day
        if (testDate) {
          const finalReviewDay = new Date(testDate);
          finalReviewDay.setDate(finalReviewDay.getDate() - 1);
          if (nextReviewDate > finalReviewDay) {
            nextReviewDate = finalReviewDay;
          }
        }
      }
    }
  }

  // ========== EASY RESPONSE ==========
  else if (rating === "easy") {
    againCount = 0; // Reset again counter
    newStep = card.currentStep + 2; // Skip one step

    if (!finalReviewMode && !emergencyMode) {
      // Calculate next review date
      if (newStep >= card.schedule.length) {
        // Completed all steps - schedule for final review day
        if (testDate) {
          const finalReviewDay = new Date(testDate);
          finalReviewDay.setDate(finalReviewDay.getDate() - 1);
          nextReviewDate = finalReviewDay;
        } else {
          // No test date - use last interval
          const interval = card.schedule[card.schedule.length - 1];
          nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        }
      } else {
        // Use next interval from schedule
        const interval = card.schedule[newStep];
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        // Cap at final review day
        if (testDate) {
          const finalReviewDay = new Date(testDate);
          finalReviewDay.setDate(finalReviewDay.getDate() - 1);
          if (nextReviewDate > finalReviewDay) {
            nextReviewDate = finalReviewDay;
          }
        }
      }
    }
  }

  return {
    nextReviewDate,
    currentStep: newStep,
    againCount,
    responseHistory,
    priority,
  };
}

/**
 * Check if today is final review day (day before test)
 * @param testDate - The test date
 * @returns True if today is the day before test
 */
export function isFinalReviewDay(testDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayBeforeTest = new Date(testDate);
  dayBeforeTest.setDate(dayBeforeTest.getDate() - 1);
  dayBeforeTest.setHours(0, 0, 0, 0);

  return today.getTime() === dayBeforeTest.getTime();
}

/**
 * Check if today is test day
 * @param testDate - The test date
 * @returns True if today is test day
 */
export function isTestDay(testDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const test = new Date(testDate);
  test.setHours(0, 0, 0, 0);

  return today.getTime() === test.getTime();
}

/**
 * Get all cards for final review (sorted by priority)
 * @param flashcards - All flashcards
 * @param deckId - The deck ID
 * @returns Cards sorted by mastery (struggling first)
 */
export function getFinalReviewCards(
  flashcards: Flashcard[],
  deckId: string
): Flashcard[] {
  const deckCards = flashcards.filter((card) => card.deckId === deckId);

  // Sort: STRUGGLING > LEARNING > MASTERED
  return deckCards.sort((a, b) => {
    const order = { STRUGGLING: 0, LEARNING: 1, MASTERED: 2 };
    return order[a.mastery] - order[b.mastery];
  });
}

/**
 * Get emergency review cards (test day - only struggling cards)
 * @param flashcards - All flashcards
 * @param deckId - The deck ID
 * @returns Struggling cards only
 */
export function getEmergencyReviewCards(
  flashcards: Flashcard[],
  deckId: string
): Flashcard[] {
  return flashcards.filter(
    (card) => card.deckId === deckId && card.mastery === "STRUGGLING"
  );
}

/**
 * Calculate mastery level based on response history
 * @param card - The flashcard
 * @param responseHistory - Array of last responses
 * @returns Mastery level: "STRUGGLING" | "MASTERED" | "LEARNING"
 */
export function calculateMastery(
  card: Flashcard,
  responseHistory: ReviewRating[]
): "STRUGGLING" | "MASTERED" | "LEARNING" {
  // Get last 3 responses
  const lastThree = responseHistory.slice(-3);

  // Count "Again" in last 3 responses
  const againCount = lastThree.filter((r) => r === "again").length;

  // STRUGGLING: 2+ "Again" in last 3 responses
  if (againCount >= 2) {
    return "STRUGGLING";
  }

  // MASTERED: Completed schedule AND last response Good/Easy
  const lastResponse = responseHistory[responseHistory.length - 1];
  if (
    card.currentStep >= card.schedule.length - 1 &&
    (lastResponse === "good" || lastResponse === "easy")
  ) {
    return "MASTERED";
  }

  // LEARNING (progressing): Past halfway point
  if (card.currentStep >= card.schedule.length / 2) {
    return "LEARNING";
  }

  // LEARNING (early): Still early in schedule
  return "LEARNING";
}

/**
 * Check if test has passed and deck needs transition dialog
 * @param deck - The deck
 * @returns True if test has passed and dialog not shown
 */
export function needsPostTestTransition(deck: Deck): boolean {
  if (!deck.testDate || deck.mode !== "TEST_PREP") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const testDate = new Date(deck.testDate);
  testDate.setHours(0, 0, 0, 0);

  return today > testDate && !deck.postTestDialogShown;
}

/**
 * Get warning message based on days until test
 * @param daysUntilTest - Days until test
 * @returns Warning message or null
 */
export function getTestWarning(daysUntilTest: number): string | null {
  if (daysUntilTest === 1) {
    return "시험이 내일이에요! 모르는 카드만 집중 복습하세요.";
  } else if (daysUntilTest === 0) {
    return "오늘이 시험이에요! 긴급 복습 모드입니다.";
  } else if (daysUntilTest < 0) {
    return "시험이 지났어요. 장기 복습 모드로 전환하시겠어요?";
  }
  return null;
}
