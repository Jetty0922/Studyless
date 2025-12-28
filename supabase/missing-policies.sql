-- ============================================================================
-- MISSING POLICIES TO ADD
-- Run this SQL in your Supabase Dashboard: SQL Editor
-- ============================================================================

-- 1. Add INSERT policy for profiles table (users need to create their own profile)
-- Note: The trigger handle_new_user() already creates profiles, but this is a backup
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STORAGE POLICIES
-- First, make sure these buckets exist in Storage (create via Dashboard if not)
-- ============================================================================

-- 2. Storage policies for flashcard-images bucket
-- Allow authenticated users to view any flashcard image (needed for viewing own cards)
CREATE POLICY "Authenticated users can view flashcard images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'flashcard-images' AND auth.role() = 'authenticated');

-- Allow users to upload images (files are stored under user_id/filename)
CREATE POLICY "Users can upload flashcard images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'flashcard-images' AND auth.role() = 'authenticated');

-- Allow users to update their own images
CREATE POLICY "Users can update own flashcard images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'flashcard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own flashcard images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'flashcard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Storage policies for flashcard-files bucket (PDFs, etc.)
CREATE POLICY "Authenticated users can view flashcard files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'flashcard-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload flashcard files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'flashcard-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own flashcard files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'flashcard-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own flashcard files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'flashcard-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- VERIFICATION QUERIES (run these to check policies exist)
-- ============================================================================

-- Check all policies on profiles table:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check all policies on storage.objects:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================================================
-- NOTES FOR SUPABASE DASHBOARD SETUP
-- ============================================================================

-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket "flashcard-images" if it doesn't exist:
--    - Click "New bucket"
--    - Name: flashcard-images
--    - Public: OFF (we use RLS policies)
--    - File size limit: 10MB recommended
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- 3. Create bucket "flashcard-files" if it doesn't exist:
--    - Click "New bucket"
--    - Name: flashcard-files  
--    - Public: OFF
--    - File size limit: 20MB recommended
--    - Allowed MIME types: application/pdf, text/plain

-- 4. Configure Authentication:
--    - Go to Authentication → URL Configuration
--    - Add redirect URL: studyless://reset-password
--    - Add redirect URL: studyless://auth/callback (for future OAuth)

-- 5. Deploy the Edge Function:
--    - Run: supabase functions deploy delete-user
--    - Or deploy via Supabase Dashboard → Edge Functions

