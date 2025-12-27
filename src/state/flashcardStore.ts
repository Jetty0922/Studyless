import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from 'uuid';
import { supabase, uploadFile } from "../lib/supabase";
import {
  Deck,
  Flashcard,
  StudyStats,
  ReviewRating,
  FSRSState,
  ReviewHistory,
} from "../types/flashcard";
import {
  reviewCard,
  generateSchedule,
  getDueCards as getDueCardsUtil,
  getInitialFSRSParams,
  isFinalReviewDay,
  applyDateCap,
  getOptionalReviewCards,
  reviewFlashcardOptional,
  LEARNING_STEPS,
  RELEARNING_STEPS,
  daysBetween,
} from "../utils/spacedRepetition";
import {
  IntervalCalculationLog,
  resetCardToNew,
  forceCardDue,
  simulateTimePassing,
} from "../utils/debugTools";
import { startOfDay, addDays, differenceInDays, subDays } from "date-fns";

interface FlashcardState {
  decks: Deck[];
  flashcards: Flashcard[];
  stats: StudyStats;
  hasCompletedOnboarding: boolean;
  
  // Debug state (admin only)
  debugMode: boolean;
  intervalLogs: IntervalCalculationLog[];
}

interface FlashcardActions {
  addDeck: (name: string, color: string, emoji?: string, testDate?: Date, mode?: "TEST_PREP" | "LONG_TERM") => Promise<string>;
  updateDeck: (id: string, updates: Partial<Pick<Deck, "name" | "emoji" | "testDate" | "status" | "mode">>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  addFlashcard: (
    deckId: string,
    front: string,
    back: string,
    imageUri?: string,
    fileUri?: string
  ) => Promise<void>;
  addFlashcardsBatch: (
    deckId: string,
    cards: { front: string; back: string; imageUri?: string; fileUri?: string }[]
  ) => Promise<void>;
  updateFlashcard: (id: string, front: string, back: string) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  reviewFlashcard: (id: string, rating: ReviewRating, reviewTimeMs?: number) => Promise<void>;
  convertToLongTerm: (deckId: string) => Promise<void>;
  toggleLongTermMode: (deckId: string, mode: "TEST_PREP" | "LONG_TERM") => Promise<void>;
  getDueCards: (deckId?: string) => Flashcard[];
  getFinalReviewCards: (deckId: string) => Flashcard[];
  getDeckById: (id: string) => Deck | undefined;
  updateDailyStats: () => Promise<void>;
  getDecksNeedingPostTestDialog: () => Deck[];
  markPostTestDialogShown: (deckId: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  syncWithSupabase: () => Promise<void>;
  migrateLocalData: () => Promise<void>;
  
  // Debug actions (admin only)
  setDebugMode: (enabled: boolean) => void;
  logIntervalCalculation: (log: IntervalCalculationLog) => void;
  clearIntervalLogs: () => void;
  resetDeck: (deckId: string) => Promise<void>;
  forceAllDue: (deckId: string) => Promise<void>;
  timeTravelDeck: (deckId: string, days: number) => Promise<void>;
  
  // TEST_PREP testing tools
  recalculateTestPrepSchedules: (deckId: string) => Promise<void>;
  simulateDaysPassing: (deckId: string, days: number) => Promise<void>;
}

const generateId = () => uuidv4();

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
      
      // Debug state (admin only)
      debugMode: false,
      intervalLogs: [],

      syncWithSupabase: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        try {
          // 1. Fetch profile/stats from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          // 2. Fetch all decks for this user
          const { data: supabaseDecks, error: decksError } = await supabase
            .from('decks')
            .select('*')
            .eq('user_id', user.id);

          if (decksError) {
            console.error("syncWithSupabase: Error fetching decks", decksError);
          }

          // 3. Fetch all flashcards for this user
          const { data: supabaseFlashcards, error: flashcardsError } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id);

          if (flashcardsError) {
            console.error("syncWithSupabase: Error fetching flashcards", flashcardsError);
            throw new Error(`Failed to fetch flashcards: ${flashcardsError.message}`);
          }
          
          // If we got 0 flashcards but have local flashcards, push them to prevent data loss
          const localFlashcards = get().flashcards;
          const localFlashcardCount = localFlashcards.length;
          if (!supabaseFlashcards || supabaseFlashcards.length === 0) {
            if (localFlashcardCount > 0) {
              
              // Try to push all local flashcards to Supabase
              try {
                const flashcardsToInsert = localFlashcards.map((card) => ({
                  id: card.id,
                  deck_id: card.deckId,
                  user_id: user.id,
                  front: card.front,
                  back: card.back,
                  image_uri: card.imageUri,
                  file_uri: card.fileUri,
                  mode: card.mode,
                  test_date: card.testDate ? (card.testDate instanceof Date ? card.testDate.toISOString() : new Date(card.testDate).toISOString()) : null,
                  next_review_date: card.nextReviewDate instanceof Date ? card.nextReviewDate.toISOString() : new Date(card.nextReviewDate).toISOString(),
                  schedule: card.schedule,
                  current_step: card.currentStep,
                  mastery: card.mastery,
                  // Learning phase fields
                  learning_state: card.learningState,
                  learning_step: card.learningStep,
                  learning_steps: card.learningSteps,
                  learning_card_type: card.learningCardType,
                  // FSRS fields
                  state: card.state,
                  stability: card.stability,
                  difficulty: card.difficulty,
                  reps: card.reps,
                  lapses: card.lapses,
                  last_review: card.lastReview ? (card.lastReview instanceof Date ? card.lastReview.toISOString() : new Date(card.lastReview).toISOString()) : null,
                  // Leech fields
                  is_leech: card.isLeech,
                  leech_suspended: card.leechSuspended,
                  response_history: card.responseHistory,
                  again_count: card.againCount || 0,
                  created_at: card.createdAt instanceof Date ? card.createdAt.toISOString() : new Date(card.createdAt).toISOString(),
                  updated_at: new Date().toISOString(),
                }));
                
                const { error: insertError } = await supabase.from('flashcards').insert(flashcardsToInsert);
                
                if (insertError) {
                  console.error("syncWithSupabase: Failed to push local flashcards:", insertError);
                  return;
                }
              } catch (e) {
                console.error("syncWithSupabase: Exception pushing flashcards:", e);
                return;
              }
            }
          }

          // 4. Transform Supabase data to local format
          const transformedDecks: Deck[] = (supabaseDecks || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            color: d.color,
            emoji: d.emoji,
            testDate: d.test_date ? new Date(d.test_date) : undefined,
            status: d.status || 'upcoming',
            cardCount: 0, // Will be calculated below
            dueCards: 0, // Will be calculated below
            mode: d.mode || 'TEST_PREP',
            finalReviewMode: d.final_review_mode,
            emergencyMode: d.emergency_mode,
            postTestDialogShown: d.post_test_dialog_shown,
          }));

          const transformedFlashcards: Flashcard[] = (supabaseFlashcards || []).map((c: any) => {
            // Find the deck to get testDate if card doesn't have it
            const cardDeck = transformedDecks.find((d) => d.id === c.deck_id);
            const cardTestDate = c.test_date 
              ? new Date(c.test_date) 
              : cardDeck?.testDate;
            
            return {
              id: c.id,
              deckId: c.deck_id,
              front: c.front,
              back: c.back,
              imageUri: c.image_uri,
              fileUri: c.file_uri,
              createdAt: c.created_at ? new Date(c.created_at) : new Date(),
              nextReviewDate: c.next_review_date ? new Date(c.next_review_date) : new Date(),
              
              mode: c.mode || cardDeck?.mode || 'TEST_PREP',
              testDate: cardTestDate,
              
              // Learning phase fields (CRITICAL for learning steps)
              // Default to 'GRADUATED' for legacy cards that don't have learning_state
              // This ensures old cards work correctly, while new cards start in LEARNING
              learningState: c.learning_state || 'GRADUATED',
              learningStep: c.learning_step ?? 0,
              learningSteps: c.learning_steps || LEARNING_STEPS,
              learningCardType: c.learning_card_type,
              
              // TEST_PREP fields
              schedule: c.schedule,
              currentStep: c.current_step ?? 0,
              mastery: c.mastery || 'LEARNING',
              
              // FSRS fields
              state: c.state ?? 2, // Default to Review state for legacy cards
              stability: c.stability ?? 1,
              difficulty: c.difficulty ?? 5,
              reps: c.reps ?? 0,
              lapses: c.lapses ?? 0,
              lastReview: c.last_review ? new Date(c.last_review) : undefined,
              
              // Leech fields
              isLeech: c.is_leech ?? false,
              leechSuspended: c.leech_suspended ?? false,
              
              responseHistory: c.response_history,
              againCount: c.again_count || 0,
            };
          });

          // Calculate card counts for each deck
          transformedDecks.forEach((deck) => {
            const deckCards = transformedFlashcards.filter((c) => c.deckId === deck.id);
            deck.cardCount = deckCards.length;
          });

          // 5. Transform stats
          const transformedStats: StudyStats = {
            currentStreak: profile?.current_streak || 0,
            longestStreak: profile?.longest_streak || 0,
            totalCardsReviewed: profile?.total_cards_reviewed || 0,
            dailyGoal: profile?.daily_goal || 20,
            cardsReviewedToday: profile?.cards_reviewed_today || 0,
            lastStudyDate: profile?.last_study_date ? new Date(profile.last_study_date) : undefined,
          };

          // 6. Update local state
          set({
            decks: transformedDecks,
            flashcards: transformedFlashcards,
            stats: transformedStats,
            hasCompletedOnboarding: profile?.has_completed_onboarding || false,
          });
        } catch (error) {
          console.error("syncWithSupabase: Error during sync", error);
        }
      },

      migrateLocalData: async () => {
        const state = get();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Sync Profile/Stats
        await supabase.from('profiles').upsert({
          id: user.id,
          has_completed_onboarding: state.hasCompletedOnboarding,
          current_streak: state.stats.currentStreak,
          longest_streak: state.stats.longestStreak,
          daily_goal: state.stats.dailyGoal,
          last_study_date: state.stats.lastStudyDate?.toISOString(),
          updated_at: new Date().toISOString(),
        });

        // 2. Sync Decks
        for (const deck of state.decks) {
          const { data: existingDeck } = await supabase
            .from('decks')
            .select('id')
            .eq('id', deck.id)
            .single();

          if (!existingDeck) {
            await supabase.from('decks').insert({
              id: deck.id,
              user_id: user.id,
              name: deck.name,
              color: deck.color,
              emoji: deck.emoji,
              test_date: deck.testDate?.toISOString(),
              status: deck.status,
              mode: deck.mode,
              final_review_mode: deck.finalReviewMode,
              emergency_mode: deck.emergencyMode,
              post_test_dialog_shown: deck.postTestDialogShown,
              created_at: new Date().toISOString(),
            });
          }
        }

        // 3. Sync Flashcards
        for (const card of state.flashcards) {
           const { data: existingCard } = await supabase
            .from('flashcards')
            .select('id')
            .eq('id', card.id)
            .single();
            
           if (!existingCard) {
             let imageUri = card.imageUri;
             let fileUri = card.fileUri;
             
             if (imageUri && !imageUri.startsWith('http')) {
                try {
                  const path = `${user.id}/${card.id}-image.jpg`;
                  const url = await uploadFile(imageUri, 'flashcard-images', path);
                  if (url) imageUri = url;
                } catch (e) {
                  console.warn("Failed to upload image during migration", e);
                }
             }
             
             // insert with new fields mapped if possible, or defaults
             await supabase.from('flashcards').insert({
                id: card.id,
                deck_id: card.deckId,
                user_id: user.id,
                front: card.front,
                back: card.back,
                image_uri: imageUri,
                file_uri: fileUri,
                next_review_date: card.nextReviewDate instanceof Date ? card.nextReviewDate.toISOString() : card.nextReviewDate,
                schedule: card.schedule,
                current_step: card.currentStep,
                mastery: card.mastery,
                state: card.state,
                stability: card.stability,
                difficulty: card.difficulty,
                last_review: card.last_review ? new Date(card.last_review).toISOString() : null,
                response_history: card.responseHistory,
                again_count: card.againCount,
                created_at: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
             });
           }
        }
      },

      addDeck: async (name, color, emoji, testDate, mode = "TEST_PREP") => {
        const id = generateId();
        
        // Optimistic update
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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('decks').insert({
            id,
            user_id: user.id,
            name,
            color,
            emoji,
            test_date: testDate?.toISOString(),
            mode,
            status: 'upcoming',
          });
        }

        return id;
      },

      updateDeck: async (id, updates) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === id);
        if (!deck) return;

        // If test date changed, recalculate schedules for all cards in this deck (TEST_PREP only)
        if (deck.mode === "TEST_PREP" && updates.testDate && updates.testDate !== deck.testDate) {
          const newTestDate = new Date(updates.testDate);

          const updatedFlashcards = state.flashcards.map((f) => {
            if (f.deckId !== id) return f;

            // Recalculate schedule based on new date
            const newSchedule = generateSchedule(newTestDate);
            
            // Reset or adjust step? Usually reset or try to map.
            // Spec says: Initialization Function: generateSchedule(testDate)
            // It implies new schedule is generated.
            // Let's keep currentStep if possible, or cap it.
            // But wait, if date changes, the "brick wall" changes.
            // Safer to regenerate schedule and keep currentStep (clamped).
            
            const currentStep = f.currentStep || 0;
            const safeStep = Math.min(currentStep, newSchedule.length - 1);
            
            // Re-calc next review date based on today + interval of current step?
            // Or just let the next review fix it?
            // Better to update nextReviewDate to fit new constraint.
            const today = startOfDay(new Date());
            const interval = newSchedule[safeStep];
            const nextReview = applyDateCap(
                addDays(today, interval), 
                newTestDate
            );

            return {
              ...f,
              schedule: newSchedule,
              currentStep: safeStep,
              nextReviewDate: nextReview,
              testDate: newTestDate,
            };
          });

          set({
            decks: state.decks.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
            flashcards: updatedFlashcards,
          });

          // DB Update
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('decks').update({
              test_date: newTestDate.toISOString(),
              ...updates,
              updated_at: new Date().toISOString(),
            }).eq('id', id);

            for (const f of updatedFlashcards) {
              if (f.deckId === id) {
                 await supabase.from('flashcards').update({
                   next_review_date: f.nextReviewDate instanceof Date 
                     ? f.nextReviewDate.toISOString() 
                     : new Date(f.nextReviewDate).toISOString(),
                   schedule: f.schedule,
                   current_step: f.currentStep,
                 }).eq('id', f.id);
              }
            }
          }

        } else {
          set({
            decks: state.decks.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
            if (updates.testDate) dbUpdates.test_date = updates.testDate.toISOString();
            await supabase.from('decks').update(dbUpdates).eq('id', id);
          }
        }
      },

      deleteDeck: async (id) => {
        const state = get();
        set({
          decks: state.decks.filter((d) => d.id !== id),
          flashcards: state.flashcards.filter((f) => f.deckId !== id),
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('decks').delete().eq('id', id);
        }
      },

      addFlashcard: async (deckId, front, back, imageUri, fileUri) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);
        if (!deck) return;

        const now = new Date();
        const today = startOfDay(now);
        let newCard: Flashcard;

        // Upload files logic (unchanged)
        let finalImageUri = imageUri;
        let finalFileUri = fileUri;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          if (imageUri && !imageUri.startsWith('http')) {
            const path = `${user.id}/${Date.now()}-image.jpg`;
            const url = await uploadFile(imageUri, 'flashcard-images', path);
            if (url) finalImageUri = url;
          }
          if (fileUri && !fileUri.startsWith('http')) {
             const path = `${user.id}/${Date.now()}-file`;
             const url = await uploadFile(fileUri, 'flashcard-files', path);
             if (url) finalFileUri = url;
          }
        }

        if (deck.mode === "LONG_TERM") {
          // LONG_TERM: Start in learning phase
          newCard = {
            id: generateId(),
            deckId,
            front,
            back,
            imageUri: finalImageUri,
            fileUri: finalFileUri,
            createdAt: now,
            
            mode: "LONG_TERM",
            nextReviewDate: now, // Due immediately
            
            // Learning phase fields
            learningState: 'LEARNING',
            learningStep: 0,
            learningSteps: LEARNING_STEPS,
            learningCardType: 'INTRADAY',
            
            // FSRS fields (will be set at graduation)
            state: FSRSState.New,
            stability: 0,
            difficulty: 5,
            
            // Tracking
            reps: 0,
            lapses: 0,
            mastery: 'LEARNING',
            
            // Leech
            isLeech: false,
            leechSuspended: false,
            
            againCount: 0,
          };
        } else {
          // TEST_PREP: Start in learning phase
          if (!deck.testDate) throw new Error("Test date is required");
          
          const schedule = generateSchedule(deck.testDate);
          
          newCard = {
            id: generateId(),
            deckId,
            front,
            back,
            imageUri: finalImageUri,
            fileUri: finalFileUri,
            createdAt: now,
            
            mode: "TEST_PREP",
            testDate: deck.testDate,
            nextReviewDate: now, // Due immediately for learning
            
            // Learning phase fields
            learningState: 'LEARNING',
            learningStep: 0,
            learningSteps: LEARNING_STEPS,
            learningCardType: 'INTRADAY',
            
            // TEST_PREP specific
            schedule,
            currentStep: 0,
            
            // FSRS fields (will be set at graduation)
            state: FSRSState.New,
            stability: 0,
            difficulty: 5,
            
            // Tracking
            reps: 0,
            lapses: 0,
            mastery: 'LEARNING',
            
            // Leech
            isLeech: false,
            leechSuspended: false,
            
            againCount: 0,
          };
        }

        set({
          flashcards: [...state.flashcards, newCard],
          decks: state.decks.map((d) =>
            d.id === deckId
              ? { ...d, cardCount: d.cardCount + 1 }
              : d
          ),
        });

        if (user) {
          const { error } = await supabase.from('flashcards').insert({
            id: newCard.id,
            deck_id: deckId,
            user_id: user.id,
            front,
            back,
            image_uri: finalImageUri,
            file_uri: finalFileUri,
            mode: newCard.mode,
            test_date: newCard.testDate ? newCard.testDate.toISOString() : null,
            next_review_date: newCard.nextReviewDate.toISOString(),
            schedule: newCard.schedule,
            current_step: newCard.currentStep,
            mastery: newCard.mastery,
            state: newCard.state,
            stability: newCard.stability,
            difficulty: newCard.difficulty,
            last_review: newCard.last_review ? newCard.last_review.toISOString() : null,
            again_count: newCard.againCount,
          });
          
          if (error) {
            console.error("addFlashcard: Error inserting flashcard to Supabase", error);
          }
        }
      },

      addFlashcardsBatch: async (deckId, cards) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);
        if (!deck) return;

        const now = new Date();
        const today = startOfDay(now);
        const { data: { user } } = await supabase.auth.getUser();

        const newCards: Flashcard[] = [];
        const dbCards: any[] = [];

        // Pre-calculate common params
        const schedule = deck.mode === "TEST_PREP" && deck.testDate 
            ? generateSchedule(deck.testDate) 
            : undefined;

        for (const card of cards) {
            const id = generateId();
            
            // Handle uploads (simplified for batch - ideally parallel)
            let finalImageUri = card.imageUri;
            let finalFileUri = card.fileUri;
            // (Upload logic omitted for brevity, same as addFlashcard)

            let newCard: Flashcard;

            if (deck.mode === "LONG_TERM") {
                newCard = {
                    id,
                    deckId,
                    front: card.front,
                    back: card.back,
                    imageUri: finalImageUri,
                    fileUri: finalFileUri,
                    createdAt: now,
                    mode: "LONG_TERM",
                    nextReviewDate: now,
                    state: 0,
                    stability: 0,
                    difficulty: 5,
                    againCount: 0,
                };
            } else {
                newCard = {
                    id,
                    deckId,
                    front: card.front,
                    back: card.back,
                    imageUri: finalImageUri,
                    fileUri: finalFileUri,
                    createdAt: now,
                    mode: "TEST_PREP",
                    testDate: deck.testDate,
                    schedule: schedule,
                    currentStep: 0,
                    nextReviewDate: today,
                    mastery: "LEARNING",
                    againCount: 0,
                };
            }
            
            newCards.push(newCard);
            
            if (user) {
                dbCards.push({
                    id: newCard.id,
                    deck_id: deckId,
                    user_id: user.id,
                    front: newCard.front,
                    back: newCard.back,
                    image_uri: newCard.imageUri,
                    file_uri: newCard.fileUri,
                    mode: newCard.mode,
                    test_date: newCard.testDate ? newCard.testDate.toISOString() : null,
                    next_review_date: newCard.nextReviewDate.toISOString(),
                    schedule: newCard.schedule,
                    current_step: newCard.currentStep,
                    mastery: newCard.mastery,
                    state: newCard.state,
                    stability: newCard.stability,
                    difficulty: newCard.difficulty,
                    last_review: newCard.last_review ? newCard.last_review.toISOString() : null,
                    again_count: newCard.againCount,
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

        if (dbCards.length > 0) {
          const { error } = await supabase.from('flashcards').insert(dbCards);
          if (error) {
            console.error("addFlashcardsBatch: Error inserting flashcards to Supabase", error);
          }
        }
      },

      updateFlashcard: async (id, front, back) => {
        set((state) => ({
          flashcards: state.flashcards.map((f) =>
            f.id === id ? { ...f, front, back } : f
          ),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('flashcards').update({ front, back, updated_at: new Date().toISOString() }).eq('id', id);
        }
      },

      deleteFlashcard: async (id) => {
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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('flashcards').delete().eq('id', id);
        }
      },

      reviewFlashcard: async (id, rating, reviewTimeMs) => {
        const state = get();
        const card = state.flashcards.find((f) => f.id === id);
        if (!card) return;

        const now = new Date();
        const deck = state.decks.find((d) => d.id === card.deckId);

        // Ensure card has required fields for review
        const cardForReview: Flashcard = {
          ...card,
          testDate: card.testDate || deck?.testDate,
          mode: card.mode || deck?.mode || 'TEST_PREP',
          learningState: card.learningState || 'LEARNING',
          learningStep: card.learningStep || 0,
          learningSteps: card.learningSteps || LEARNING_STEPS,
          mastery: card.mastery || 'LEARNING',
          stability: card.stability || 0,
          difficulty: card.difficulty || 5,
          reps: card.reps || 0,
          lapses: card.lapses || 0,
          isLeech: card.isLeech || false,
          leechSuspended: card.leechSuspended || false,
          state: card.state || FSRSState.New,
        };

        // Use new unified reviewCard function
        const updates = reviewCard(cardForReview, rating, now);
        
        // Add review time to updates
        if (reviewTimeMs !== undefined) {
          (updates as Partial<Flashcard>).reviewTimeMs = reviewTimeMs;
        }

        // Update local state
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
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Store review history
          const elapsedDays = card.lastReview 
            ? daysBetween(new Date(card.lastReview), now) 
            : 0;
          const scheduledDays = card.stability || 0;
          
          try {
            await supabase.from('review_history').insert({
              id: uuidv4(),
              user_id: user.id,
              card_id: id,
              rating: rating === 'AGAIN' ? 1 : rating === 'HARD' ? 2 : rating === 'GOOD' ? 3 : 4,
              review_date: now.toISOString(),
              review_time_ms: reviewTimeMs,  // Track answer time
              elapsed_days: elapsedDays,
              scheduled_days: scheduledDays,
              state: card.state || 0,
              stability: card.stability || 0,
              difficulty: card.difficulty || 5,
              ease_factor: card.easeFactor,  // Track ease factor
            });
          } catch (e) {
            console.error("Failed to store review history:", e);
          }

          // Update flashcard in DB
          const dbUpdates: Record<string, unknown> = {
            updated_at: now.toISOString()
          };
           
          if (updates.nextReviewDate) {
            dbUpdates.next_review_date = updates.nextReviewDate instanceof Date 
              ? updates.nextReviewDate.toISOString() 
              : new Date(updates.nextReviewDate).toISOString();
          }

          // Learning phase fields
          if (updates.learningState !== undefined) dbUpdates.learning_state = updates.learningState;
          if (updates.learningStep !== undefined) dbUpdates.learning_step = updates.learningStep;
          if (updates.learningSteps !== undefined) dbUpdates.learning_steps = updates.learningSteps;
          if (updates.learningCardType !== undefined) dbUpdates.learning_card_type = updates.learningCardType;

          // FSRS fields
          if (updates.state !== undefined) dbUpdates.state = updates.state;
          if (updates.stability !== undefined) dbUpdates.stability = updates.stability;
          if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
          if (updates.reps !== undefined) dbUpdates.reps = updates.reps;
          if (updates.lapses !== undefined) dbUpdates.lapses = updates.lapses;
          if (updates.lastReview) {
            dbUpdates.last_review = updates.lastReview instanceof Date 
              ? updates.lastReview.toISOString() 
              : new Date(updates.lastReview).toISOString();
          }
           
          // TEST_PREP fields
          if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep;
          if (updates.mastery) dbUpdates.mastery = updates.mastery;
          
          // Leech fields
          if (updates.isLeech !== undefined) dbUpdates.is_leech = updates.isLeech;
          if (updates.leechSuspended !== undefined) dbUpdates.leech_suspended = updates.leechSuspended;
           
          await supabase.from('flashcards').update(dbUpdates).eq('id', id);

          // Update stats in profile
          await supabase.from('profiles').update({
            updated_at: now.toISOString()
          }).eq('id', user.id);
        }
      },

      convertToLongTerm: async (deckId) => {
        const state = get();
        const now = new Date();

        const updatedFlashcards = state.flashcards.map((f) => {
            if (f.deckId !== deckId) return f;

            // Initialize FSRS params based on mastery
            const initialParams = getInitialFSRSParams(f.mastery);
            
            // Critical Edge Case (The Gap)
            // Set card.last_review = card.testDate
            // This is tricky if testDate is null or in future. 
            // Assuming testDate is in the past (test passed).
            // If testDate is not set, fallback to createdAt or now.
            // Use NOW as the review date to avoid time-travel bugs
            // (testDate could be in the past if test already happened)
            const lastReviewDate = now;
            
            // Calculate next due date from now using initial stability
            const nextDue = addDays(now, initialParams.stability);

            return {
              ...f,
              mode: "LONG_TERM" as const,
              testDate: undefined,
              schedule: undefined,
              currentStep: undefined,
              mastery: undefined,
              
              ...initialParams, // state, stability, difficulty
              last_review: lastReviewDate,
              nextReviewDate: nextDue,
            };
        });

        set({
          flashcards: updatedFlashcards,
          decks: state.decks.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  mode: "LONG_TERM" as const,
                  status: "in-progress" as const,
                  postTestDialogShown: true,
                  testDate: undefined,
                }
              : d
          ),
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           await supabase.from('decks').update({
             mode: "LONG_TERM",
             status: "in-progress",
             post_test_dialog_shown: true,
             test_date: null,
             updated_at: new Date().toISOString()
           }).eq('id', deckId);
           
           // Bulk update cards
           const deckCards = updatedFlashcards.filter(f => f.deckId === deckId);
           
           // Determine efficient way to bulk update. 
           // For now, loop or RPC. Loop is safe for stability.
           for (const f of deckCards) {
               await supabase.from('flashcards').update({
                   mode: "LONG_TERM",
                   test_date: null,
                   schedule: null,
                   current_step: null,
                   mastery: null,
                   state: f.state,
                   stability: f.stability,
                   difficulty: f.difficulty,
                   last_review: f.last_review 
                     ? (f.last_review instanceof Date ? f.last_review.toISOString() : new Date(f.last_review).toISOString())
                     : null,
                   next_review_date: f.nextReviewDate instanceof Date 
                     ? f.nextReviewDate.toISOString() 
                     : new Date(f.nextReviewDate).toISOString()
               }).eq('id', f.id);
           }
        }
      },

      toggleLongTermMode: async (deckId, mode) => {
        if (mode === "LONG_TERM") {
            await get().convertToLongTerm(deckId);
        }
        // Switching back to TEST_PREP requires a Test Date and is handled by UI
      },

      getDueCards: (deckId) => {
        const state = get();
        const allCards = state.flashcards;
        const allDecks = state.decks;
        
        // If deckId provided, filter inputs
        const relevantDecks = deckId ? allDecks.filter(d => d.id === deckId) : allDecks;
        const relevantCards = deckId ? allCards.filter(c => c.deckId === deckId) : allCards;
        
        // TODO: Get testDayLockoutEnabled from settings store
        return getDueCardsUtil(relevantCards, relevantDecks, true);
      },

      getFinalReviewCards: (deckId) => {
        const state = get();
        const deck = state.decks.find((d) => d.id === deckId);
        if (!deck?.testDate) return [];
        
        // Re-use logic from getDueCards? 
        // getDueCards handles final review logic already.
        // But if we specifically want ONLY final review cards:
        if (isFinalReviewDay(deck.testDate)) {
             return state.flashcards.filter(c => c.deckId === deckId);
        }
        return [];
      },

      getDeckById: (id) => {
        return get().decks.find((d) => d.id === id);
      },

      updateDailyStats: async () => {
        const state = get();
        const today = startOfDay(new Date());
        
        let newStats = { ...state.stats };
        const lastStudy = state.stats.lastStudyDate
          ? startOfDay(new Date(state.stats.lastStudyDate))
          : null;

        if (lastStudy) {
          const daysDiff = differenceInDays(today, lastStudy);

          if (daysDiff === 0) {
            return;
          } else if (daysDiff === 1) {
            const newStreak = state.stats.currentStreak + 1;
            newStats = {
                ...state.stats,
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, state.stats.longestStreak),
                lastStudyDate: today,
                cardsReviewedToday: 0,
            };
          } else {
            newStats = {
                ...state.stats,
                currentStreak: 1,
                lastStudyDate: today,
                cardsReviewedToday: 0,
            };
          }
        } else {
          newStats = {
              ...state.stats,
              currentStreak: 1,
              longestStreak: 1,
              lastStudyDate: today,
              cardsReviewedToday: 0,
          };
        }
        
        set({ stats: newStats });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           await supabase.from('profiles').update({
             current_streak: newStats.currentStreak,
             longest_streak: newStats.longestStreak,
             last_study_date: today.toISOString(),
           }).eq('id', user.id);
        }
      },

      getDecksNeedingPostTestDialog: () => {
        const state = get();
        const today = startOfDay(new Date());

        return state.decks.filter((deck) => {
          if (!deck.testDate) return false;
          if (deck.postTestDialogShown) return false; // Already shown
          
          const testDate = startOfDay(new Date(deck.testDate));

          // Show dialog if test date has passed (or is today)
          return (testDate <= today) &&
                 deck.mode === "TEST_PREP" &&
                 deck.status === "upcoming";
        });
      },

      markPostTestDialogShown: async (deckId) => {
        const state = get();
        set({
          decks: state.decks.map((d) =>
            d.id === deckId 
              ? { ...d, status: "in-progress" as const, postTestDialogShown: true } 
              : d
          ),
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('decks').update({ 
            status: 'in-progress',
            post_test_dialog_shown: true 
          }).eq('id', deckId);
        }
      },

      completeOnboarding: async () => {
        set({ hasCompletedOnboarding: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ has_completed_onboarding: true }).eq('id', user.id);
        }
      },

      // ============================================
      // DEBUG ACTIONS (Admin Only)
      // ============================================

      setDebugMode: (enabled: boolean) => {
        set({ debugMode: enabled });
      },

      logIntervalCalculation: (log: IntervalCalculationLog) => {
        set((state) => ({
          intervalLogs: [...state.intervalLogs.slice(-99), log], // Keep last 100 logs
        }));
      },

      clearIntervalLogs: () => {
        set({ intervalLogs: [] });
      },

      resetDeck: async (deckId: string) => {
        const state = get();
        
        // Reset all cards in the deck to new state
        const updatedFlashcards = state.flashcards.map((card) => {
          if (card.deckId !== deckId) return card;
          return { ...card, ...resetCardToNew(card) };
        });
        
        set({ flashcards: updatedFlashcards });
        
        // Update in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deckCards = updatedFlashcards.filter(c => c.deckId === deckId);
          
          for (const card of deckCards) {
            await supabase.from('flashcards').update({
              learning_state: 'LEARNING',
              learning_step: 0,
              learning_steps: LEARNING_STEPS,
              learning_card_type: 'INTRADAY',
              state: 0, // FSRSState.New
              stability: 0,
              difficulty: 5,
              next_review_date: new Date().toISOString(),
              reps: 0,
              lapses: 0,
              last_review: null,
              is_leech: false,
              leech_suspended: false,
              mastery: 'LEARNING',
              current_step: 0,
              updated_at: new Date().toISOString(),
            }).eq('id', card.id);
          }
          
          // Delete review history for this deck's cards
          const cardIds = deckCards.map(c => c.id);
          if (cardIds.length > 0) {
            await supabase.from('review_history')
              .delete()
              .in('card_id', cardIds);
          }
        }
      },

      forceAllDue: async (deckId: string) => {
        const state = get();
        const now = new Date();
        
        // Force all cards in deck to be due now
        const updatedFlashcards = state.flashcards.map((card) => {
          if (card.deckId !== deckId) return card;
          return { ...card, ...forceCardDue(card) };
        });
        
        set({ flashcards: updatedFlashcards });
        
        // Update in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deckCards = state.flashcards.filter(c => c.deckId === deckId);
          
          for (const card of deckCards) {
            await supabase.from('flashcards').update({
              next_review_date: now.toISOString(),
              updated_at: now.toISOString(),
            }).eq('id', card.id);
          }
        }
      },

      timeTravelDeck: async (deckId: string, days: number) => {
        const state = get();
        
        // Shift all dates back by X days
        const updatedFlashcards = state.flashcards.map((card) => {
          if (card.deckId !== deckId) return card;
          return { ...card, ...simulateTimePassing(card, days) };
        });
        
        set({ flashcards: updatedFlashcards });
        
        // Update in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deckCards = updatedFlashcards.filter(c => c.deckId === deckId);
          
          for (const card of deckCards) {
            const dbUpdates: Record<string, unknown> = {
              updated_at: new Date().toISOString(),
            };
            
            if (card.nextReviewDate) {
              dbUpdates.next_review_date = card.nextReviewDate instanceof Date
                ? card.nextReviewDate.toISOString()
                : new Date(card.nextReviewDate).toISOString();
            }
            
            if (card.lastReview) {
              dbUpdates.last_review = card.lastReview instanceof Date
                ? card.lastReview.toISOString()
                : new Date(card.lastReview).toISOString();
            }
            
            await supabase.from('flashcards').update(dbUpdates).eq('id', card.id);
          }
        }
      },
      
      recalculateTestPrepSchedules: async (deckId: string) => {
        const state = get();
        const deck = state.decks.find(d => d.id === deckId);
        if (!deck?.testDate || deck.mode !== 'TEST_PREP') return;
        
        const testDate = new Date(deck.testDate);
        const now = new Date();
        const today = startOfDay(now);
        
        // Import phase logic
        const { getExamPhase } = await import('../utils/examScheduler');
        const { calculateOptimalReviewTime } = await import('../utils/retrievability');
        
        const phaseConfig = getExamPhase(testDate);
        const { phase, targetRetention, daysLeft } = phaseConfig;
        
        // Recalculate nextReviewDate for all cards based on current phase
        const updatedFlashcards = state.flashcards.map((card) => {
          if (card.deckId !== deckId) return card;
          if (card.learningState !== 'GRADUATED') return card; // Skip learning cards
          
          const stability = card.stability || 1;
          let newInterval: number;
          
          if (phase === 'CRAM' || phase === 'EXAM_DAY') {
            // CRAM: Schedule for tomorrow or today
            newInterval = Math.min(1, daysLeft);
          } else if (phase === 'CONSOLIDATION') {
            newInterval = Math.min(
              Math.max(1, calculateOptimalReviewTime(stability, targetRetention)),
              daysLeft
            );
          } else {
            // MAINTENANCE
            newInterval = Math.min(
              Math.max(1, calculateOptimalReviewTime(stability, 0.75)),
              daysLeft
            );
          }
          
          const newDueDate = addDays(today, Math.round(newInterval));
          
          return {
            ...card,
            nextReviewDate: newDueDate
          };
        });
        
        set({ flashcards: updatedFlashcards });
        
        // Update in Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const deckCards = updatedFlashcards.filter(c => c.deckId === deckId);
          for (const card of deckCards) {
            await supabase.from('flashcards').update({
              next_review_date: card.nextReviewDate instanceof Date
                ? card.nextReviewDate.toISOString()
                : new Date(card.nextReviewDate).toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', card.id);
          }
        }
      },
      
      simulateDaysPassing: async (deckId: string, days: number) => {
        const state = get();
        const deck = state.decks.find(d => d.id === deckId);
        if (!deck) return;
        
        // For TEST_PREP: Move test date closer (backward) to simulate days passing
        if (deck.mode === 'TEST_PREP' && deck.testDate) {
          const currentTestDate = new Date(deck.testDate);
          const newTestDate = subDays(currentTestDate, days);
          
          // Update deck with new test date
          const updatedDecks = state.decks.map(d => 
            d.id === deckId ? { ...d, testDate: newTestDate } : d
          );
          set({ decks: updatedDecks });
          
          // Update in Supabase
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('decks').update({
              test_date: newTestDate.toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', deckId);
          }
        }
        
        // Now also shift card dates (like time travel)
        await get().timeTravelDeck(deckId, days);
        
        // Finally, recalculate schedules based on new phase
        await get().recalculateTestPrepSchedules(deckId);
      },
    }),
    {
      name: "flashcard-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 7, // Bump version for date handling fixes
      migrate: (persistedState: any, version: number) => {
        // Reconstitute Date objects from ISO strings
        if (persistedState && typeof persistedState === 'object') {
          // Fix deck dates
          if (Array.isArray(persistedState.decks)) {
            persistedState.decks = persistedState.decks.map((deck: any) => ({
              ...deck,
              testDate: deck.testDate ? new Date(deck.testDate) : undefined,
            }));
          }
          
          // Fix flashcard dates
          if (Array.isArray(persistedState.flashcards)) {
            persistedState.flashcards = persistedState.flashcards.map((card: any) => ({
              ...card,
              createdAt: card.createdAt ? new Date(card.createdAt) : new Date(),
              nextReviewDate: card.nextReviewDate ? new Date(card.nextReviewDate) : new Date(),
              testDate: card.testDate ? new Date(card.testDate) : undefined,
              last_review: card.last_review ? new Date(card.last_review) : undefined,
            }));
          }
          
          // Fix stats dates
          if (persistedState.stats?.lastStudyDate) {
            persistedState.stats.lastStudyDate = new Date(persistedState.stats.lastStudyDate);
          }
        }
        return persistedState;
      },
    }
  )
);
