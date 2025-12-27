// src/types/flashcard.ts

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

/**
 * Learning state of a card
 * - LEARNING: New card going through initial learning steps
 * - RELEARNING: Graduated card that failed (AGAIN pressed)
 * - GRADUATED: Completed learning, now in review cycle
 */
export type LearningState = 'LEARNING' | 'RELEARNING' | 'GRADUATED';

/**
 * Learning card type (affects due detection)
 * - INTRADAY: Short intervals that don't cross midnight (exact timestamp)
 * - INTERDAY: Intervals that cross midnight (day-based scheduling at 4 AM)
 */
export type LearningCardType = 'INTRADAY' | 'INTERDAY';

/**
 * Deck mode
 * - TEST_PREP: Fixed ladder for exam cramming
 * - LONG_TERM: FSRS adaptive intervals for lifelong retention
 */
export type DeckMode = 'TEST_PREP' | 'LONG_TERM';

/**
 * Mastery level (user-facing)
 * - LEARNING: Normal progress
 * - STRUGGLING: Having trouble (pressed HARD or 2+ lapses)
 * - MASTERED: Doing well (high stability or top of ladder)
 */
export type MasteryLevel = 'LEARNING' | 'STRUGGLING' | 'MASTERED';

/**
 * FSRS states
 */
export enum FSRSState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3
}

/**
 * Rating enum (matches FSRS)
 * 1 = Again (forgot)
 * 2 = Hard (barely remembered)
 * 3 = Good (remembered)
 * 4 = Easy (too easy)
 */
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

// ============================================================================
// FLASHCARD INTERFACE
// ============================================================================

export interface Flashcard {
  // ============================================
  // CORE FIELDS
  // ============================================
  id: string;
  deckId: string;
  userId?: string;
  front: string;
  back: string;
  imageUri?: string;
  fileUri?: string;
  createdAt: Date;

  // ============================================
  // MODE
  // ============================================
  mode: DeckMode;

  // ============================================
  // LEARNING PHASE FIELDS
  // Used when learningState = LEARNING or RELEARNING
  // ============================================
  
  /**
   * learningState: Current learning phase
   * - LEARNING: New card going through learning steps
   * - RELEARNING: Failed review, going through relearning steps
   * - GRADUATED: Completed learning, in normal review cycle
   */
  learningState: LearningState;
  
  /**
   * learningStep: Current step index (0-based)
   * Example: learningSteps = [900, 3600]
   *   step 0 = 15 minutes
   *   step 1 = 1 hour
   */
  learningStep: number;
  
  /**
   * learningSteps: Array of intervals in SECONDS
   * LEARNING: [900, 3600] = 15 min, 1 hour
   * RELEARNING: [600] = 10 min
   */
  learningSteps: number[];
  
  /**
   * learningCardType: Affects due detection
   * - INTRADAY: Same-day review (exact timestamp comparison)
   * - INTERDAY: Crossed midnight (day-based comparison at 4 AM)
   */
  learningCardType?: LearningCardType;

  // ============================================
  // TEST_PREP MODE FIELDS
  // ============================================
  
  testDate?: Date;          // Required for TEST_PREP mode
  schedule?: number[];      // The ladder: [0, 1, 3, 7, 14, 21, 28, 35, 45, 60]
  currentStep?: number;     // Position in ladder (0-9)

  // ============================================
  // MASTERY
  // ============================================
  
  mastery: MasteryLevel;

  // ============================================
  // FSRS FIELDS
  // ============================================
  
  /**
   * stability: Memory strength in days
   * 
   * TEST_PREP:
   *   - Calculated ONLY at graduation
   *   - FROZEN after that (never updated)
   *   - Used for mode switching
   * 
   * LONG_TERM:
   *   - Calculated at graduation
   *   - Updated after EVERY review
   */
  stability: number;
  
  /**
   * difficulty: Card difficulty (1-10 scale)
   * Higher = harder card (needs shorter intervals)
   * Default starting value: 5
   */
  difficulty: number;
  
  /**
   * state: FSRS state enum
   * 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
   */
  state: FSRSState;

  // ============================================
  // REVIEW TRACKING
  // ============================================
  
  reps: number;             // Total number of reviews
  lapses: number;           // Total number of failures (AGAIN presses)
  lastReview?: Date;        // Timestamp of last review (was last_review)
  lastResponse?: ReviewRating;

  // ============================================
  // SCHEDULING
  // ============================================
  
  nextReviewDate: Date;

  // ============================================
  // LEECH DETECTION
  // ============================================
  
  /**
   * isLeech: True when lapses >= LEECH_THRESHOLD (6)
   * Indicates card needs to be rewritten/simplified/suspended
   */
  isLeech: boolean;
  
  /**
   * leechSuspended: User chose to suspend this leech
   * If true, card is excluded from due card queries
   */
  leechSuspended: boolean;

  // ============================================
  // LEGACY/COMPAT FIELDS
  // ============================================
  
  againCount?: number;
  responseHistory?: ReviewRating[];
  priority?: 'NORMAL' | 'HIGH';
  last_review?: Date;       // Legacy snake_case, use lastReview instead
  fsrs?: Record<string, unknown>;
}

// ============================================================================
// DECK INTERFACE
// ============================================================================

export interface Deck {
  id: string;
  userId?: string;
  name: string;
  color: string;
  emoji?: string;
  mode: DeckMode;
  testDate?: Date;
  status: "upcoming" | "in-progress" | "completed";
  createdAt?: Date;
  updatedAt?: Date;
  
  // Stats (computed)
  cardCount: number;
  dueCards?: number;
  
  // Test Prep Specifics
  finalReviewMode?: boolean;
  emergencyMode?: boolean;
  postTestDialogShown?: boolean;
  
  // Urgency (computed)
  daysLeft?: number;
}

// ============================================================================
// STUDY STATS INTERFACE
// ============================================================================

export interface StudyStats {
  currentStreak: number;
  longestStreak: number;
  totalCardsReviewed: number;
  dailyGoal: number;
  cardsReviewedToday: number;
  lastStudyDate?: Date;
}

// ============================================================================
// REVIEW HISTORY INTERFACE
// ============================================================================

/**
 * Review history entry
 * Logged after every review for future FSRS optimization
 */
export interface ReviewHistory {
  id: string;
  userId: string;
  cardId: string;
  rating: Rating;
  reviewDate: Date;
  elapsedDays: number;      // Days since last review
  scheduledDays: number;    // What was originally scheduled
  
  /**
   * reviewTimeMs: Answer time in milliseconds
   * 
   * Future use:
   * - Cheating detection (< 1 second = suspicious)
   * - Analytics (average time per card)
   * - FSRS optimization (fast = easy, slow = hard)
   */
  reviewTimeMs?: number;
  
  // FSRS state at time of review
  state: FSRSState;
  stability: number;
  difficulty: number;
}

// ============================================================================
// SCHEDULE WARNING INTERFACE
// ============================================================================

/**
 * Schedule health check warning
 */
export interface ScheduleWarning {
  type: 'CARDS_PAST_TEST' | 'LEECH_DETECTED' | 'OVERDUE_CARDS';
  count: number;
  recommendation: string;
}
