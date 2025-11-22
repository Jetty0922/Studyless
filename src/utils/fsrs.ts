import { Flashcard, ReviewRating, FSRSParameters } from "../types/flashcard";

// FSRS-4 Algorithm Parameters
const FSRS_PARAMS = {
  requestRetention: 0.9, // Target 90% retention
  maximumInterval: 36500, // 100 years in days
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ], // Default FSRS-4 weights
};

/**
 * Initialize FSRS parameters for a new card or transition from test-prep
 * @param mastery - Current mastery level from test-prep
 * @returns Initial FSRS parameters
 */
export function initializeFSRS(
  mastery: "STRUGGLING" | "LEARNING" | "MASTERED" = "LEARNING"
): FSRSParameters {
  // Set initial stability based on test-prep performance
  let initialStability: number;
  let initialDifficulty: number;

  switch (mastery) {
    case "MASTERED":
      initialStability = 4.0; // 4 days
      initialDifficulty = 3.0; // Easy
      break;
    case "LEARNING":
      initialStability = 2.0; // 2 days
      initialDifficulty = 5.0; // Medium
      break;
    case "STRUGGLING":
      initialStability = 1.0; // 1 day
      initialDifficulty = 7.0; // Hard
      break;
  }

  return {
    stability: initialStability,
    difficulty: initialDifficulty,
    retrievability: 0.9, // Start fresh
    reviewCount: 0,
  };
}

/**
 * Calculate next interval based on FSRS algorithm
 * @param stability - Current stability
 * @param requestRetention - Target retention (0-1)
 * @returns Days until next review
 */
function calculateInterval(
  stability: number,
  requestRetention: number = FSRS_PARAMS.requestRetention
): number {
  // I = S × (R^(1/D) - 1) where D is decay constant (9 for 90% retention)
  const interval = stability * (Math.pow(requestRetention, 1 / 9) - 1);
  return Math.max(1, Math.min(Math.round(interval), FSRS_PARAMS.maximumInterval));
}

/**
 * Calculate new stability after review
 * @param state - Current FSRS state
 * @param rating - Review rating
 * @param retrievability - Current retrievability
 * @returns New stability
 */
function calculateStability(
  state: FSRSParameters,
  rating: ReviewRating,
  retrievability: number
): number {
  const { stability, difficulty } = state;
  const w = FSRS_PARAMS.w;

  let newStability: number;

  switch (rating) {
    case "again":
      // Forgetting: S' = w[11] × D^(-w[12]) × (S^w[13] - 1) × e^(w[14] × (1 - R))
      newStability =
        w[11] *
        Math.pow(difficulty, -w[12]) *
        (Math.pow(stability, w[13]) - 1) *
        Math.exp(w[14] * (1 - retrievability));
      break;

    case "hard":
      // Hard: S' = S × (1 + e^(w[15]) × (11 - D) × S^(-w[16]) × (e^(w[17] × (1 - R)) - 1))
      newStability =
        stability *
        (1 +
          Math.exp(w[15]) *
            (11 - difficulty) *
            Math.pow(stability, -w[16]) *
            (Math.exp(w[17] * (1 - retrievability)) - 1));
      break;

    case "good":
      // Good: S' = S × (1 + e^(w[8]) × (11 - D) × S^(-w[9]) × (e^(w[10] × (1 - R)) - 1))
      newStability =
        stability *
        (1 +
          Math.exp(w[8]) *
            (11 - difficulty) *
            Math.pow(stability, -w[9]) *
            (Math.exp(w[10] * (1 - retrievability)) - 1));
      break;

    case "easy":
      // Easy: Similar to good but with higher multiplier
      newStability =
        stability *
        (1 +
          Math.exp(w[8]) *
            (11 - difficulty) *
            Math.pow(stability, -w[9]) *
            (Math.exp(w[10] * (1 - retrievability)) - 1) *
          1.3); // 30% bonus for easy
      break;
  }

  return Math.max(0.1, newStability);
}

/**
 * Calculate new difficulty after review
 * @param currentDifficulty - Current difficulty
 * @param rating - Review rating
 * @returns New difficulty (clamped between 1-10)
 */
function calculateDifficulty(
  currentDifficulty: number,
  rating: ReviewRating
): number {
  const w = FSRS_PARAMS.w;
  let newDifficulty: number;

  // D' = D - w[6] × (g - 3) where g is grade (1=again, 2=hard, 3=good, 4=easy)
  const grade =
    rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4;
  newDifficulty = currentDifficulty - w[6] * (grade - 3);

  // Clamp between 1 and 10
  return Math.max(1, Math.min(10, newDifficulty));
}

/**
 * Calculate current retrievability based on time since last review
 * @param stability - Current stability
 * @param daysSinceReview - Days since last review
 * @returns Retrievability (0-1)
 */
function calculateRetrievability(
  stability: number,
  daysSinceReview: number
): number {
  // R = e^(-t/S × ln(0.9)) where t is days since review
  return Math.exp((-daysSinceReview / stability) * Math.log(0.9));
}

/**
 * Process FSRS review and calculate next review date
 * @param card - The flashcard
 * @param rating - Review rating
 * @returns Updated FSRS parameters and next review date
 */
export function processFSRSReview(
  card: Flashcard,
  rating: ReviewRating
): { fsrs: FSRSParameters; nextReviewDate: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Initialize FSRS if not present
  const fsrs = card.fsrs || initializeFSRS(card.mastery);

  // Calculate retrievability if this is a review
  let retrievability = fsrs.retrievability;
  if (fsrs.lastReview) {
    const lastReview = new Date(fsrs.lastReview);
    lastReview.setHours(0, 0, 0, 0);
    const daysSinceReview = Math.max(
      0,
      (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
    );
    retrievability = calculateRetrievability(fsrs.stability, daysSinceReview);
  }

  // Calculate new stability and difficulty
  const newStability = calculateStability(fsrs, rating, retrievability);
  const newDifficulty = calculateDifficulty(fsrs.difficulty, rating);

  // Calculate next interval
  const interval = calculateInterval(newStability);

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    fsrs: {
      stability: newStability,
      difficulty: newDifficulty,
      retrievability: 0.9, // Reset to target after review
      lastReview: now,
      reviewCount: fsrs.reviewCount + 1,
    },
    nextReviewDate,
  };
}

/**
 * Get recommended daily review count based on FSRS
 * @param cards - All cards
 * @returns Recommended daily review count
 */
export function getRecommendedDailyReviews(cards: Flashcard[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueCards = cards.filter((card) => {
    if (card.mode !== "LONG_TERM") return false;
    const reviewDate = new Date(card.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate <= today;
  });

  return dueCards.length;
}

