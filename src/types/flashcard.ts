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
// EXAM PHASE TYPE
// ============================================================================

/**
 * Exam preparation phase for 3-phase scheduler
 */
export type ExamPhase = 'MAINTENANCE' | 'CONSOLIDATION' | 'CRAM' | 'EXAM_DAY' | 'POST_EXAM';

/**
 * Leech action taken by user
 */
export type LeechAction = 'SIMPLIFIED' | 'SPLIT' | 'MNEMONIC_ADDED' | 'SUSPENDED';

/**
 * Card insertion order
 */
export type InsertionOrder = 'SEQUENTIAL' | 'RANDOM';

// ============================================================================
// EASY DAY INTERFACE
// ============================================================================

/**
 * Configuration for days with reduced workload
 */
export interface EasyDay {
  dayOfWeek?: number;  // 0 (Sunday) - 6 (Saturday) for recurring
  date?: Date;         // Specific date
  maxCards: number;    // Reduced limit for this day
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
   * Example: learningSteps = [600]
   *   step 0 = 10 minutes
   */
  learningStep: number;
  
  /**
   * learningSteps: Array of intervals in SECONDS
   * LEARNING: [600] = 10 min (FSRS-optimized single step)
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
  // EASE FACTOR (NEW - SM-2 compatibility)
  // ============================================
  
  /**
   * easeFactor: Interval multiplier (2.5 = 250% default)
   * Modified by reviews: -20% Again, -15% Hard, +15% Easy
   * Floor at 1.3 (130%) to prevent Ease Hell
   */
  easeFactor?: number;

  // ============================================
  // RETRIEVABILITY (NEW - probability tracking)
  // ============================================
  
  /**
   * retrievability: Current recall probability (0-1)
   * Calculated dynamically using R(t) = (1 + factor × t/S)^(-power)
   * Optionally cached for performance
   */
  retrievability?: number;
  
  /**
   * rAtExam: Projected retrievability at exam date
   * Only for TEST_PREP mode during CRAM phase
   * Used to prioritize cards by weakest memory at exam time
   */
  rAtExam?: number;

  // ============================================
  // REVIEW TRACKING
  // ============================================
  
  reps: number;             // Total number of reviews
  lapses: number;           // Total number of failures (AGAIN presses)
  lastReview?: Date;        // Timestamp of last review (was last_review)
  lastResponse?: ReviewRating;
  
  /**
   * reviewTimeMs: Answer time in milliseconds
   * Used for analytics and cheating detection (< 1s = suspicious)
   */
  reviewTimeMs?: number;

  // ============================================
  // SCHEDULING
  // ============================================
  
  nextReviewDate: Date;
  
  /**
   * originalDueDate: Original scheduled date before load balancing
   * Used to track if card was moved for workload smoothing
   */
  originalDueDate?: Date;

  // ============================================
  // LEECH DETECTION
  // ============================================
  
  /**
   * isLeech: True when lapses >= LEECH_THRESHOLD (4)
   * Indicates card needs to be rewritten/simplified/suspended
   */
  isLeech: boolean;
  
  /**
   * leechSuspended: User chose to suspend this leech
   * If true, card is excluded from due card queries
   */
  leechSuspended: boolean;
  
  /**
   * leechAction: Action taken by user when card became leech
   */
  leechAction?: LeechAction;

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
  
  // ============================================
  // EXAM SCHEDULER (NEW)
  // ============================================
  
  /**
   * examPhase: Current exam preparation phase
   * Determined by days until test:
   * - MAINTENANCE: > 30 days, R_target = 75%
   * - CONSOLIDATION: 7-30 days, R_target = 75-95%
   * - CRAM: 1-7 days, R_target = 95-99%
   * - EXAM_DAY: Test day
   * - POST_EXAM: After test date
   */
  examPhase?: ExamPhase;
  
  /**
   * desiredRetention: User's target retention rate (0.85-0.95)
   * Higher = more reviews, better retention
   * Default: 0.90 (90%)
   */
  desiredRetention?: number;
  
  // ============================================
  // LOAD BALANCING (NEW)
  // ============================================
  
  /**
   * maxCardsPerDay: Maximum total cards per day for this deck
   * 0 = unlimited
   */
  maxCardsPerDay?: number;
  
  /**
   * newCardsPerDay: New cards per day limit
   * Default: 20
   */
  newCardsPerDay?: number;
  
  /**
   * easyDays: Days with reduced load (weekends, holidays)
   */
  easyDays?: EasyDay[];
  
  /**
   * insertionOrder: How new cards are ordered
   * - SEQUENTIAL: In order of creation
   * - RANDOM: Shuffled
   */
  insertionOrder?: InsertionOrder;
  
  // ============================================
  // TEST PREP SPECIFICS
  // ============================================
  
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
   * Uses:
   * - Cheating detection (< 1 second = suspicious)
   * - Analytics (average time per card)
   * - FSRS optimization (fast = easy, slow = hard)
   */
  reviewTimeMs?: number;
  
  // FSRS state at time of review
  state: FSRSState;
  stability: number;
  difficulty: number;
  
  /**
   * easeFactor: Ease Factor at time of review
   * For tracking Ease Hell and recovery
   */
  easeFactor?: number;
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
