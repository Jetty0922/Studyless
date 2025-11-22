import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Deck,
  Flashcard,
  StudyStats,
  ReviewRating,
} from "../types/flashcard";
import {
  calculateSchedule,
  calculateNextReview,
  isFinalReviewDay,
  isTestDay,
  calculateMastery,
} from "../utils/spacedRepetition";
import { initializeFSRS, processFSRSReview } from "../utils/fsrs";

interface FlashcardState {
  decks: Deck[];
  flashcards: Flashcard[];
  stats: StudyStats;
  hasCompletedOnboarding: boolean;
}

interface FlashcardActions {
  addDeck: (name: string, color: string, emoji?: string, testDate?: Date, mode?: "TEST_PREP" | "LONG_TERM") => string;
  updateDeck: (id: string, updates: Partial<Pick<Deck, "name" | "emoji" | "testDate" | "status" | "mode">>) => void;
  deleteDeck: (id: string) => void;
  addFlashcard: (
    deckId: string,
    front: string,
    back: string,
    imageUri?: string,
    fileUri?: string
  ) => void;
  addFlashcardsBatch: (
    deckId: string,
    cards: Array<{ front: string; back: string; imageUri?: string; fileUri?: string }>
  ) => void;
  updateFlashcard: (id: string, front: string, back: string) => void;
  deleteFlashcard: (id: string) => void;
  reviewFlashcard: (id: string, rating: ReviewRating) => void;
  convertToLongTerm: (deckId: string) => void;
  toggleLongTermMode: (deckId: string, mode: "TEST_PREP" | "LONG_TERM") => void;
  getDueCards: (deckId?: string) => Flashcard[];
  getFinalReviewCards: (deckId: string) => Flashcard[];
  getDeckById: (id: string) => Deck | undefined;
  updateDailyStats: () => void;
  getDecksNeedingPostTestDialog: () => Deck[];
  markPostTestDialogShown: (deckId: string) => void;
  completeOnboarding: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useFlashcardStore = create<FlashcardState & FlashcardActions>()(
  persist(
    (set, get) => ({
      decks: [],
      flashcards: [],
      stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalCardsReviewed: 0,
        dailyGoal: 20,
        cardsReviewedToday: 0,
      },
      hasCompletedOnboarding: false,

      addDeck: (name, color, emoji, testDate, mode = "TEST_PREP") => {
        const id = generateId();
        set((state) => ({
          decks: [
            ...state.decks,
            {
              id,
              name,
              color,
              emoji,
              testDate,
              status: "upcoming",
              cardCount: 0,
              dueCards: 0,
              mode,
            },
          ],
        }));
        return id;
      },

      updateDeck: (id, updates) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === id);
        if (!deck) return;

        // If test date changed, recalculate schedules for all cards in this deck
        if (updates.testDate && updates.testDate !== deck.testDate) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const newTestDate = new Date(updates.testDate);

          set({
            decks: state.decks.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
            flashcards: state.flashcards.map((f) => {
              if (f.deckId !== id) return f;

              // Recalculate schedule based on new test date
              const daysUntilTest = Math.ceil(
                (newTestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              const newSchedule = calculateSchedule(daysUntilTest);

              // Reset to appropriate step if current step is beyond new schedule
              const newStep = Math.min(f.currentStep, newSchedule.length - 1);

              // Recalculate next review date
              const createdDate = new Date(f.createdAt);
              createdDate.setHours(0, 0, 0, 0);
              const nextReview = new Date(createdDate);
              nextReview.setDate(nextReview.getDate() + newSchedule[newStep]);

              // Cap at day before test
              const dayBeforeTest = new Date(newTestDate);
              dayBeforeTest.setDate(dayBeforeTest.getDate() - 1);
              if (nextReview > dayBeforeTest) {
                nextReview.setTime(dayBeforeTest.getTime());
              }

              return {
                ...f,
                schedule: newSchedule,
                currentStep: newStep,
                nextReviewDate: nextReview,
                testDate: newTestDate,
              };
            }),
          });
        } else {
          set({
            decks: state.decks.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
          });
        }
      },

      deleteDeck: (id) => {
        const state = get();

        set({
          decks: state.decks.filter((d) => d.id !== id),
          flashcards: state.flashcards.filter((f) => f.deckId !== id),
        });
      },

      addFlashcard: (deckId, front, back, imageUri, fileUri) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);
        if (!deck) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Check if deck is in LONG_TERM mode
        if (deck.mode === "LONG_TERM") {
          // For long-term decks, use FSRS algorithm
          const fsrs = initializeFSRS("LEARNING");
          const interval = Math.round(fsrs.stability);
          const nextReview = new Date(now);
          nextReview.setDate(nextReview.getDate() + interval);

          const newCard: Flashcard = {
            id: generateId(),
            deckId,
            front,
            back,
            imageUri,
            fileUri,
            createdAt: now,
            nextReviewDate: nextReview,
            schedule: [0],
            currentStep: 0,
            mode: "LONG_TERM",
            testDate: undefined,
            mastery: "LEARNING",
            responseHistory: [],
            againCount: 0,
            priority: "NORMAL",
            fsrs,
          };

          set({
            flashcards: [...state.flashcards, newCard],
            decks: state.decks.map((d) =>
              d.id === deckId
                ? { ...d, cardCount: d.cardCount + 1 }
                : d
            ),
          });
          return;
        }

        // TEST_PREP mode - test date is mandatory
        if (!deck.testDate) {
          throw new Error("Test date is required for test prep mode");
        }

        const testDate = new Date(deck.testDate);
        const daysUntilTest = Math.ceil(
          (testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const schedule = calculateSchedule(daysUntilTest);

        const newCard: Flashcard = {
          id: generateId(),
          deckId,
          front,
          back,
          imageUri,
          fileUri,
          createdAt: now,
          nextReviewDate: now,
          schedule,
          currentStep: 0,
          mode: "TEST_PREP",
          testDate,
          mastery: "LEARNING",
          responseHistory: [],
          againCount: 0,
          priority: "NORMAL",
        };

        set({
          flashcards: [...state.flashcards, newCard],
          decks: state.decks.map((d) =>
            d.id === deckId
              ? { ...d, cardCount: d.cardCount + 1 }
              : d
          ),
        });
      },

      addFlashcardsBatch: (deckId, cards) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);
        if (!deck) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const newCards: Flashcard[] = [];

        // Check if deck is in LONG_TERM mode
        if (deck.mode === "LONG_TERM") {
          // For long-term decks, use FSRS algorithm
          for (const card of cards) {
            const fsrs = initializeFSRS("LEARNING");
            const interval = Math.round(fsrs.stability);
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + interval);

            newCards.push({
              id: generateId(),
              deckId,
              front: card.front,
              back: card.back,
              imageUri: card.imageUri,
              fileUri: card.fileUri,
              createdAt: now,
              nextReviewDate: nextReview,
              schedule: [0],
              currentStep: 0,
              mode: "LONG_TERM",
              testDate: undefined,
              mastery: "LEARNING",
              responseHistory: [],
              againCount: 0,
              priority: "NORMAL",
              fsrs,
            });
          }
        } else {
          // TEST_PREP mode - test date is mandatory
          if (!deck.testDate) {
            throw new Error("Test date is required for test prep mode");
          }

          const testDate = new Date(deck.testDate);
          const daysUntilTest = Math.ceil(
            (testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const schedule = calculateSchedule(daysUntilTest);

          for (const card of cards) {
            newCards.push({
              id: generateId(),
              deckId,
              front: card.front,
              back: card.back,
              imageUri: card.imageUri,
              fileUri: card.fileUri,
              createdAt: now,
              nextReviewDate: now,
              schedule,
              currentStep: 0,
              mode: "TEST_PREP",
              testDate,
              mastery: "LEARNING",
              responseHistory: [],
              againCount: 0,
              priority: "NORMAL",
            });
          }
        }

        set({
          flashcards: [...state.flashcards, ...newCards],
          decks: state.decks.map((d) =>
            d.id === deckId
              ? { ...d, cardCount: d.cardCount + newCards.length }
              : d
          ),
        });
      },

      updateFlashcard: (id, front, back) => {
        set((state) => ({
          flashcards: state.flashcards.map((f) =>
            f.id === id ? { ...f, front, back } : f
          ),
        }));
      },

      deleteFlashcard: (id) => {
        const state = get();
        const card = state.flashcards.find((f) => f.id === id);
        if (!card) return;

        set({
          flashcards: state.flashcards.filter((f) => f.id !== id),
          decks: state.decks.map((d) =>
            d.id === card.deckId
              ? { ...d, cardCount: Math.max(0, d.cardCount - 1) }
              : d
          ),
        });
      },

      reviewFlashcard: (id, rating) => {
        const state = get();
        const card = state.flashcards.find((f) => f.id === id);
        if (!card) return;

        const deck = state.decks.find((d) => d.id === card.deckId);
        const now = new Date();

        // Check for final review or emergency mode
        const finalReviewMode = deck?.testDate ? isFinalReviewDay(deck.testDate) : false;
        const emergencyMode = deck?.testDate ? isTestDay(deck.testDate) : false;

        // Update deck modes if needed
        if (deck && (finalReviewMode || emergencyMode)) {
          set({
            decks: state.decks.map((d) =>
              d.id === deck.id
                ? {
                    ...d,
                    finalReviewMode,
                    emergencyMode,
                  }
                : d
            ),
          });
        }

        let updates: Partial<Flashcard>;

        if (card.mode === "LONG_TERM") {
          // Use FSRS algorithm
          const { fsrs, nextReviewDate } = processFSRSReview(card, rating);
          updates = {
            lastReviewed: now,
            nextReviewDate,
            fsrs,
            lastResponse: rating,
            responseHistory: [...(card.responseHistory || []), rating].slice(-5),
          };
        } else {
          // Use TEST_PREP algorithm
          const {
            nextReviewDate,
            currentStep,
            againCount,
            responseHistory,
            priority,
          } = calculateNextReview(card, rating, card.testDate, deck);

          const mastery = calculateMastery(card, responseHistory);

          updates = {
            lastReviewed: now,
            nextReviewDate,
            currentStep,
            lastResponse: rating,
            mastery,
            responseHistory,
            againCount,
            priority,
          };
        }

        set({
          flashcards: state.flashcards.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
          stats: {
            ...state.stats,
            totalCardsReviewed: state.stats.totalCardsReviewed + 1,
            cardsReviewedToday: state.stats.cardsReviewedToday + 1,
          },
        });
      },

      convertToLongTerm: (deckId) => {
        const state = get();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        set({
          flashcards: state.flashcards.map((f) => {
            if (f.deckId !== deckId) return f;

            // Initialize FSRS based on test-prep mastery
            const fsrs = initializeFSRS(f.mastery);
            const interval = Math.round(fsrs.stability);
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + interval);

            return {
              ...f,
              mode: "LONG_TERM" as const,
              nextReviewDate: nextReview,
              currentStep: 0,
              fsrs,
            };
          }),
          decks: state.decks.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  mode: "LONG_TERM" as const,
                  status: "in-progress" as const,
                  postTestDialogShown: true,
                }
              : d
          ),
        });
      },

      toggleLongTermMode: (deckId, mode) => {
        const state = get();

        if (mode === "LONG_TERM") {
          // Convert to long-term mode - use FSRS
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          set({
            flashcards: state.flashcards.map((f) => {
              if (f.deckId !== deckId) return f;

              // Initialize FSRS based on current mastery
              const fsrs = initializeFSRS(f.mastery);
              const interval = Math.round(fsrs.stability);
              const nextReview = new Date(now);
              nextReview.setDate(nextReview.getDate() + interval);

              return {
                ...f,
                mode: "LONG_TERM" as const,
                nextReviewDate: nextReview,
                currentStep: 0,
                schedule: [0], // Long-term uses FSRS, not fixed schedule
                mastery: "LEARNING" as const, // Reset mastery
                lastReviewed: undefined, // Clear review history
                lastResponse: undefined,
                responseHistory: [],
                againCount: 0,
                priority: "NORMAL" as const,
                fsrs,
              };
            }),
            decks: state.decks.map((d) =>
              d.id === deckId
                ? {
                    ...d,
                    mode: "LONG_TERM" as const,
                    status: "in-progress" as const,
                    testDate: undefined, // Clear test date when switching to long-term
                  }
                : d
            ),
          });
        } else {
          // Convert to test prep mode - reset all progress
          // Test date is mandatory, will remain undefined until user sets it
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          set({
            flashcards: state.flashcards.map((f) =>
              f.deckId === deckId
                ? {
                    ...f,
                    mode: "TEST_PREP" as const,
                    nextReviewDate: now, // Schedule for today
                    currentStep: 0,
                    schedule: [0, 1, 3, 7, 14, 21], // Default schedule
                    mastery: "LEARNING" as const, // Reset mastery
                    lastReviewed: undefined, // Clear review history
                    lastResponse: undefined,
                    testDate: undefined, // Must be set by user before adding cards
                    responseHistory: [],
                    againCount: 0,
                    priority: "NORMAL" as const,
                    fsrs: undefined, // Clear FSRS data
                  }
                : f
            ),
            decks: state.decks.map((d) =>
              d.id === deckId
                ? {
                    ...d,
                    mode: "TEST_PREP" as const,
                    status: "upcoming" as const,
                    testDate: undefined, // Must be set by user
                  }
                : d
            ),
          });
        }
      },

      getDueCards: (deckId) => {
        const state = get();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let dueCards = state.flashcards.filter((card) => {
          const reviewDate = new Date(card.nextReviewDate);
          reviewDate.setHours(0, 0, 0, 0);
          return reviewDate <= now;
        });

        if (deckId) {
          dueCards = dueCards.filter((card) => card.deckId === deckId);
        }

        return dueCards;
      },

      getFinalReviewCards: (deckId) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);

        if (!deck?.testDate || !isFinalReviewDay(deck.testDate)) {
          return [];
        }

        return state.flashcards.filter((card) => card.deckId === deckId);
      },

      getDeckById: (id) => {
        return get().decks.find((d) => d.id === id);
      },

      updateDailyStats: () => {
        const state = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastStudy = state.stats.lastStudyDate
          ? new Date(state.stats.lastStudyDate)
          : null;

        if (lastStudy) {
          lastStudy.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor(
            (today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 0) {
            return;
          } else if (daysDiff === 1) {
            const newStreak = state.stats.currentStreak + 1;
            set({
              stats: {
                ...state.stats,
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, state.stats.longestStreak),
                lastStudyDate: today,
                cardsReviewedToday: 0,
              },
            });
          } else {
            set({
              stats: {
                ...state.stats,
                currentStreak: 1,
                lastStudyDate: today,
                cardsReviewedToday: 0,
              },
            });
          }
        } else {
          set({
            stats: {
              ...state.stats,
              currentStreak: 1,
              longestStreak: 1,
              lastStudyDate: today,
              cardsReviewedToday: 0,
            },
          });
        }
      },

      getDecksNeedingPostTestDialog: () => {
        const state = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return state.decks.filter((deck) => {
          if (!deck.testDate) return false;
          const testDate = new Date(deck.testDate);
          testDate.setHours(0, 0, 0, 0);

          // Check if test date has passed (today or earlier) and deck is in test prep mode and still upcoming
          return testDate <= today &&
                 deck.mode === "TEST_PREP" &&
                 deck.status === "upcoming";
        });
      },

      markPostTestDialogShown: (deckId: string) => {
        const state = get();
        set({
          decks: state.decks.map((d) =>
            d.id === deckId ? { ...d, status: "in-progress" as const } : d
          ),
        });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },
    }),
    {
      name: "flashcard-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
      migrate: (persistedState: any, version: number) => {
        // Migrate from version 4 to version 5 - add FSRS and test-prep tracking fields
        if (version < 5 && persistedState) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          const flashcards = (persistedState.flashcards || []).map((card: any) => {
            const updated = {
              ...card,
              responseHistory: card.responseHistory || [],
              againCount: card.againCount || 0,
              priority: card.priority || "NORMAL",
            };

            // Initialize FSRS for LONG_TERM cards
            if (card.mode === "LONG_TERM" && !card.fsrs) {
              updated.fsrs = initializeFSRS(card.mastery || "LEARNING");
            }

            return updated;
          });

          const decks = (persistedState.decks || []).map((deck: any) => ({
            ...deck,
            finalReviewMode: deck.finalReviewMode || false,
            emergencyMode: deck.emergencyMode || false,
            postTestDialogShown: deck.postTestDialogShown || false,
          }));

          return {
            ...persistedState,
            flashcards,
            decks,
          };
        }

        // Migrate from version 3 to version 4 - add mode field to decks
        if (version < 4 && persistedState) {
          const decks = (persistedState.decks || []).map((deck: any) => ({
            ...deck,
            mode: deck.mode || (deck.status === "in-progress" ? "LONG_TERM" : "TEST_PREP"),
          }));

          return {
            ...persistedState,
            decks,
          };
        }

        // Migrate from version 2 (with subjects and chapters) to version 3 (decks only)
        if (version < 3 && persistedState) {
          // Convert chapters to decks, merge in subject properties
          const subjects = persistedState.subjects || [];
          const chapters = persistedState.chapters || [];

          const decks = chapters.map((chapter: any) => {
            const subject = subjects.find((s: any) => s.id === chapter.subjectId);

            return {
              id: chapter.id,
              name: chapter.name,
              color: subject?.color || "#3B82F6",
              emoji: subject?.emoji,
              testDate: chapter.testDate,
              status: chapter.status || "upcoming",
              cardCount: chapter.cardCount || 0,
              dueCards: 0, // Will be calculated from flashcards
              mode: chapter.status === "in-progress" ? "LONG_TERM" : "TEST_PREP",
            };
          });

          // Update flashcards to use deckId instead of chapterId
          const flashcards = (persistedState.flashcards || []).map((card: any) => {
            const { chapterId, ...rest } = card;
            return {
              ...rest,
              deckId: chapterId,
            };
          });

          return {
            ...persistedState,
            decks,
            flashcards,
            subjects: undefined, // Remove subjects
            chapters: undefined, // Remove chapters
          };
        }

        // Migrate from version 1 (with sections) to version 3
        if (version < 2 && persistedState) {
          const migratedFlashcards = (persistedState.flashcards || []).map((card: any) => {
            // Find the section and chapter for this card
            const section = persistedState.sections?.find((s: any) => s.id === card.sectionId);
            const deckId = section?.chapterId || "unknown";

            // Remove sectionId and add deckId
            const { sectionId, chapterId, ...rest } = card;
            return {
              ...rest,
              deckId: deckId,
              schedule: card.schedule || [0, 2, 7, 14, 21],
              currentStep: card.currentStep ?? 0,
              mode: card.mode || "TEST_PREP",
              mastery: card.mastery || "LEARNING",
            };
          });

          // Convert chapters to decks
          const subjects = persistedState.subjects || [];
          const chapters = persistedState.chapters || [];

          const decks = chapters.map((chapter: any) => {
            const subject = subjects.find((s: any) => s.id === chapter.subjectId);
            const { sectionCount, ...rest } = chapter;

            return {
              ...rest,
              color: subject?.color || "#3B82F6",
              emoji: subject?.emoji,
              dueCards: 0,
              mode: chapter.status === "in-progress" ? "LONG_TERM" : "TEST_PREP",
            };
          });

          return {
            ...persistedState,
            decks,
            flashcards: migratedFlashcards,
            subjects: undefined,
            chapters: undefined,
            sections: undefined,
          };
        }

        return persistedState;
      },
    }
  )
);
