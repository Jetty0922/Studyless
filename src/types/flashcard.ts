export interface FSRSParameters {
  stability: number;      // How well the card is retained in memory
  difficulty: number;     // How hard the card is (0-10)
  retrievability: number; // Current probability of recall (0-1)
  lastReview?: Date;
  reviewCount: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  imageUri?: string;
  fileUri?: string;
  createdAt: Date;
  lastReviewed?: Date;
  nextReviewDate: Date;
  schedule: number[]; // e.g., [0, 1, 3, 7, 14, 21] - days from today
  currentStep: number; // current position in schedule
  mode: "TEST_PREP" | "LONG_TERM"; // test prep or post-test long-term
  testDate?: Date; // the test this card is preparing for
  lastResponse?: ReviewRating; // last review rating
  mastery: "STRUGGLING" | "LEARNING" | "MASTERED"; // current mastery level
  
  // FSRS parameters (for LONG_TERM mode)
  fsrs?: FSRSParameters;
  
  // Test-prep tracking
  responseHistory: ReviewRating[]; // Last 5 responses
  againCount: number; // Consecutive "again" count in current session
  priority: "NORMAL" | "LOW"; // Priority level for struggling cards
}

export interface Deck {
  id: string;
  name: string;
  color: string; // hex color for identification
  emoji?: string; // mascot emoji for the deck
  testDate?: Date;
  status: "upcoming" | "in-progress" | "completed";
  cardCount: number;
  dueCards: number;
  mode: "TEST_PREP" | "LONG_TERM"; // deck mode determines card scheduling
  
  // Test-prep modes
  finalReviewMode?: boolean; // Day before test
  emergencyMode?: boolean; // Test day
  postTestDialogShown?: boolean; // Prevent repeated dialogs
}

export interface ReviewSession {
  cards: Flashcard[];
  currentIndex: number;
  reviewed: number;
  correct: number;
  startTime: Date;
}

export interface StudyStats {
  currentStreak: number;
  longestStreak: number;
  totalCardsReviewed: number;
  lastStudyDate?: Date;
  dailyGoal: number;
  cardsReviewedToday: number;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";
