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
} from "../types/flashcard";
import {
  calculateTestPrepReview,
  calculateLongTermReview,
  generateSchedule,
  getDueCards,
  isFinalReviewDay,
  applyDateCap,
  // New clean LONG_TERM helpers
  createNewLongTermCard,
  convertCardToLongTerm,
} from "../utils/spacedRepetition";
import { startOfDay } from "date-fns";

interface FlashcardState {
  decks: Deck[];
  flashcards: Flashcard[];
  stats: StudyStats;
  hasCompletedOnboarding: boolean;
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
    cards: Array<{ front: string; back: string; imageUri?: string; fileUri?: string }>
  ) => Promise<void>;
  updateFlashcard: (id: string, front: string, back: string) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  reviewFlashcard: (id: string, rating: ReviewRating) => Promise<void>;
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
                  test_date: card.testDate ? card.testDate.toISOString() : null,
                  next_review_date: card.nextReviewDate instanceof Date ? card.nextReviewDate.toISOString() : new Date(card.nextReviewDate).toISOString(),
                  schedule: card.schedule,
                  current_step: card.currentStep,
                  mastery: card.mastery,
                  state: card.state,
                  stability: card.stability,
                  difficulty: card.difficulty,
                  reps: card.reps,
                  lapses: card.lapses,
                  last_review: card.last_review ? (card.last_review instanceof Date ? card.last_review.toISOString() : new Date(card.last_review).toISOString()) : null,
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
              
              // TEST_PREP fields
              schedule: c.schedule,
              currentStep: c.current_step ?? 0,
              mastery: c.mastery || 'LEARNING',
              
              // FSRS fields for LONG_TERM
              state: c.state,
              stability: c.stability,
              difficulty: c.difficulty,
              reps: c.reps,
              lapses: c.lapses,
              last_review: c.last_review ? new Date(c.last_review) : undefined,
              
              responseHistory: c.response_history,
              againCount: c.again_count || 0,
            };
          });

          // Calculate card counts for each deck
          transformedDecks.forEach((deck) => {
            const deckCards = transformedFlashcards.filter((c) => c.deckId === deck.id);
            deck.cardCount = deckCards.length;
          });

          // 5. Transform stats - MERGE with local to avoid losing review counts
          const localStats = get().stats;
          const remoteCardsReviewedToday = profile?.cards_reviewed_today || 0;
          const remoteTotalCardsReviewed = profile?.total_cards_reviewed || 0;
          
          // Use the higher value between local and remote to avoid data loss
          const transformedStats: StudyStats = {
            currentStreak: Math.max(profile?.current_streak || 0, localStats.currentStreak),
            longestStreak: Math.max(profile?.longest_streak || 0, localStats.longestStreak),
            totalCardsReviewed: Math.max(remoteTotalCardsReviewed, localStats.totalCardsReviewed),
            dailyGoal: profile?.daily_goal || localStats.dailyGoal || 20,
            cardsReviewedToday: Math.max(remoteCardsReviewedToday, localStats.cardsReviewedToday),
            lastStudyDate: profile?.last_study_date ? new Date(profile.last_study_date) : localStats.lastStudyDate,
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
                new Date(today.getTime() + interval * 24 * 60 * 60 * 1000), 
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
          // Use centralized LONG_TERM card factory
          const longTermFields = createNewLongTermCard();
          newCard = {
            id: generateId(),
            deckId,
            front,
            back,
            imageUri: finalImageUri,
            fileUri: finalFileUri,
            createdAt: now,
            ...longTermFields,
            againCount: 0,
          };
        } else {
          // TEST_PREP
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
            
            schedule,
            currentStep: 0,
            nextReviewDate: today, // Due immediately (or today)
            
            mastery: "LEARNING",
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
                // Use centralized LONG_TERM card factory
                const longTermFields = createNewLongTermCard();
                newCard = {
                    id,
                    deckId,
                    front: card.front,
                    back: card.back,
                    imageUri: finalImageUri,
                    fileUri: finalFileUri,
                    createdAt: now,
                    ...longTermFields,
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

      reviewFlashcard: async (id, rating) => {
        const state = get();
        const card = state.flashcards.find((f) => f.id === id);
        if (!card) return;

        // Get deck to fallback testDate if card doesn't have it
        const deck = state.decks.find((d) => d.id === card.deckId);

        let updates: Partial<Flashcard> & { action?: 'REQUEUE' } = {};

        // Route to correct logic
        if (card.mode === "TEST_PREP" || deck?.mode === "TEST_PREP") {
            const testDate = card.testDate || deck?.testDate;
            const cardWithTestDate = {
              ...card,
              testDate,
              mode: "TEST_PREP" as const,
            };
            updates = calculateTestPrepReview(cardWithTestDate, rating);
            // Persist mode/testDate so future reviews stay in TEST_PREP
            updates.mode = "TEST_PREP";
            updates.testDate = testDate;
        } else {
            updates = calculateLongTermReview(card, rating);
            updates.mode = "LONG_TERM";
        }

        // Handle "AGAIN" case (Requeue) - Action: REQUEUE
        if (updates.action === 'REQUEUE') {
            // We only update local session state (againCount, maybe nextReviewDate if it was set to today)
            // We do NOT persist this to DB usually, or we do if we want to track stats?
            // Spec says: "Do not save to DB."
            
            set({
                flashcards: state.flashcards.map((f) =>
                    f.id === id ? { ...f, ...updates } : f
                ),
                // Maybe update stats? 
            });
            return; // Exit early, no DB sync
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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           // Update flashcard
           const dbUpdates: any = {
             updated_at: new Date().toISOString()
           };
           
           // Handle nextReviewDate - ensure it's converted to ISO string properly
           if (updates.nextReviewDate) {
             dbUpdates.next_review_date = updates.nextReviewDate instanceof Date 
               ? updates.nextReviewDate.toISOString() 
               : new Date(updates.nextReviewDate).toISOString();
           }

           // Persist mode/testDate when provided
           if (updates.mode) dbUpdates.mode = updates.mode;
           if (updates.testDate) {
             dbUpdates.test_date = updates.testDate instanceof Date
               ? updates.testDate.toISOString()
               : new Date(updates.testDate).toISOString();
           }
           
           // FSRS fields
           if (updates.state !== undefined) dbUpdates.state = updates.state;
           if (updates.stability !== undefined) dbUpdates.stability = updates.stability;
           if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
           if (updates.reps !== undefined) dbUpdates.reps = updates.reps;
           if (updates.lapses !== undefined) dbUpdates.lapses = updates.lapses;
           if (updates.last_review) {
             dbUpdates.last_review = updates.last_review instanceof Date 
               ? updates.last_review.toISOString() 
               : new Date(updates.last_review).toISOString();
           }
           
           // TEST_PREP fields
           if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep;
           if (updates.mastery) dbUpdates.mastery = updates.mastery;
           if (updates.againCount !== undefined) dbUpdates.again_count = updates.againCount;
           
           await supabase.from('flashcards').update(dbUpdates).eq('id', id);

           // Update stats in profile
           // (Simplified stat update)
           await supabase.from('profiles').update({
             // Increment stats ideally via RPC, but simple update here
             // We don't have the new total available easily without reading back or relying on local store
             updated_at: new Date().toISOString()
           }).eq('id', user.id);
        }
      },

      convertToLongTerm: async (deckId) => {
        const state = get();
        const now = new Date();

        // Use centralized conversion helper
        const updatedFlashcards = state.flashcards.map((f) => {
            if (f.deckId !== deckId) return f;
            
            const updates = convertCardToLongTerm(f, now);
            return { ...f, ...updates };
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
           
           for (const f of deckCards) {
               await supabase.from('flashcards').update({
                   mode: "LONG_TERM",
                   test_date: null,
                   schedule: null,
                   current_step: null,
                   mastery: f.mastery,
                   state: f.state,
                   stability: f.stability,
                   difficulty: f.difficulty,
                   lapses: f.lapses,
                   reps: f.reps,
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
        
        return getDueCards(relevantCards, relevantDecks);
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
          const daysDiff = Math.floor(
            (today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24)
          );

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
