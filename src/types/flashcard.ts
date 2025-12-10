// src/types/flashcard.ts

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

// We export a unified Card interface as Flashcard for backward compatibility
// or we can rename it to Flashcard to match existing codebase conventions.
// The plan refers to 'Card', but the codebase uses 'Flashcard'. 
// We will update Flashcard to match the new Card contract.

export interface Flashcard {
  id: string;
  deckId: string;
  userId?: string; // Optional as it might not be on the object in some contexts, but good to have
  front: string;
  back: string;
  imageUri?: string;
  fileUri?: string;
  createdAt: Date;

  // --- MODE SWITCH ---
  mode: 'TEST_PREP' | 'LONG_TERM';

  // --- TEST PREP FIELDS ---
  testDate?: Date;       // We use Date object in app state, string in DB.
  schedule?: number[];     // The Ladder: [0, 1, 3, 7...]
  currentStep?: number;    // Index of current interval
  mastery?: 'LEARNING' | 'STRUGGLING' | 'MASTERED';
  priority?: 'NORMAL' | 'HIGH'; // Kept for backward compat if needed, or can be removed if not in spec

  // --- LONG TERM (FSRS) FIELDS ---
  // Using snake_case for FSRS specific fields to match ts-fsrs generally or keep camelCase?
  // The plan uses: state, stability, difficulty, last_review.
  state?: number;      // 0=New, 1=Learning, 2=Review, 3=Relearning
  stability?: number;  // Memory strength
  difficulty?: number; // 1-10
  last_review?: Date;  // We use Date in app state
  reps?: number;       // Number of reviews (required by FSRS)
  lapses?: number;     // Number of lapses/failures (required by FSRS)

  // --- SESSION DATA ---
  nextReviewDate: Date; // Unified for both modes
  lastResponse?: ReviewRating;
  againCount?: number;    // Local session fail count
  
  // Legacy fields to maintain compatibility or explicit removal?
  // We'll keep them optional/deprecated if they exist in DB but aren't used.
  responseHistory?: ReviewRating[]; // Good for analytics
  fsrs?: Record<string, unknown>; // Legacy FSRS data
}

export interface Deck {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  testDate?: Date;
  status: "upcoming" | "in-progress" | "completed";
  mode: "TEST_PREP" | "LONG_TERM";
  
  // Stats
  cardCount: number;
  dueCards?: number; // Computed
  
  // Test Prep Specifics
  finalReviewMode?: boolean;
  emergencyMode?: boolean;
  postTestDialogShown?: boolean;
  
  // Urgency (Computed on the fly usually)
  daysLeft?: number;
}

export interface StudyStats {
  currentStreak: number;
  longestStreak: number;
  totalCardsReviewed: number;
  dailyGoal: number;
  cardsReviewedToday: number;
  lastStudyDate?: Date;
}
