---
name: Backend Implementation Plan (Supabase)
overview: ""
todos: []
---

# Backend Implementation Plan (Supabase)

We will transform the local-only app into a cloud-connected application using Supabase.

## Phase 1: Project & Database Setup

1.  **Create Supabase Project**: Initialize a new project to get API URL and Keys.
2.  **Define Database Schema**: Run SQL to create the following tables:

    -   `profiles`: Links to Supabase Auth users.
        -   Columns: `id` (uuid, PK), `theme` (text), `has_completed_onboarding` (bool), `daily_goal` (int), `current_streak` (int), `longest_streak` (int), `last_study_date` (timestamp), `push_token` (text).
    -   `decks`: Stores deck info.
        -   Columns: `id` (uuid, PK), `user_id` (uuid, FK), `name` (text), `color` (text), `emoji` (text), `test_date` (timestamp), `status` (text), `mode` (text), `final_review_mode` (bool), `emergency_mode` (bool), `post_test_dialog_shown` (bool).
    -   `flashcards`: Stores card content and study progress.
        -   Columns: `id` (uuid, PK), `deck_id` (uuid, FK), `front` (text), `back` (text), `image_uri` (text), `file_uri` (text), `created_at` (timestamp), `next_review_date` (timestamp), `schedule` (int array), `current_step` (int), `mastery` (text), `response_history` (jsonb), `fsrs` (jsonb), `priority` (text).

3.  **Row Level Security (RLS)**: Secure tables so users can only access their own data.

## Phase 2: App Configuration

4.  **Install Dependencies**: Add `@supabase/supabase-js` and storage helpers.
5.  **Environment Setup**: Create `.env` file for Supabase keys.
6.  **Initialize Client**: Create `src/lib/supabase.ts` to export the Supabase client.

## Phase 3: Authentication

7.  **Auth Context**: Create a provider to manage the user session state.
8.  **Sign Up Screen**: Connect `CreateAccountScreen.tsx` to Supabase `signUp`.
9.  **Sign In Screen**: Connect `SignInScreen.tsx` to Supabase `signInWithPassword`.
10. **Profile Sync**: Ensure `hasCompletedOnboarding` and `theme` sync to `profiles` table.

## Phase 4: Data Integration (CRUD)

11. **Store Refactor**: Modify `flashcardStore.ts`:

    -   Replace `persist` middleware with a custom sync logic or keep it as a local cache that syncs with DB on mount.
    -   Update `addDeck`, `updateDeck`, `deleteDeck` to write to Supabase.
    -   Update `addFlashcard`, `reviewFlashcard` (stats updates) to write to Supabase.

12. **Theme Integration**: Update `themeStore.ts` to sync theme changes to `profiles`.

## Phase 5: Storage (Images & Files)

13. **Storage Buckets**: Create `flashcard-images` and `flashcard-files` buckets in Supabase.
14. **Upload Logic**: Implement `uploadImage(uri)` helper in `src/lib/supabase.ts`.
15. **Card Creation**: Update card creation to upload images/files first, then save the public URL to the DB.

## Phase 6: Migration (Optional)

16. **Data Migration**: Write a utility to upload existing local `AsyncStorage` data to Supabase for the user's first login.