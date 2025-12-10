# Testing Guide for Flashcard Bug Fixes

## Quick Test - Verify the Main Bug is Fixed

### Setup
1. Restart the app to ensure all changes are loaded
2. Create a new deck with a test date (or use an existing deck)
3. Add at least 25 flashcards to the deck

### Test Steps
1. **Navigate to the deck** - You should see "25 cards ready to review" (or however many you created)

2. **Start Review Session**
   - Tap "Start Review"
   - Review **3-5 cards** using GOOD or EASY ratings
   - Note which cards you reviewed

3. **Exit Review Early**
   - Tap the X button in the top left
   - You should be back at the deck screen

4. **Verify Cards Remain**
   - ✅ **PASS**: You should see approximately 20-22 cards still due (25 minus the ones you reviewed)
   - ❌ **FAIL**: If it shows "All Caught Up" with 0 cards, the bug is not fixed

5. **Background/Resume Test**
   - Background the app (swipe up to home screen)
   - Wait 5 seconds
   - Resume the app
   - ✅ **PASS**: Cards should still be there
   - ❌ **FAIL**: If cards disappeared, check terminal logs for sync warnings

## What to Look For in Terminal Logs

### Good Signs ✅
```
LOG  syncWithSupabase: Sync complete - X decks, Y flashcards
```
Where Y > 0 (you should see your flashcards count)

```
LOG  syncWithSupabase: Successfully pushed X flashcards to Supabase
```
This means local flashcards were recovered and saved to database

### Warning Signs ⚠️
```
WARN  syncWithSupabase: WARNING - Have X local flashcards but 0 from Supabase!
WARN  syncWithSupabase: Attempting to push local flashcards to Supabase...
```
This is OK - it means the fix is working and recovering your data

### Bad Signs ❌
```
ERROR addFlashcard: Error inserting flashcard to Supabase
ERROR addFlashcardsBatch: Error inserting flashcards to Supabase
```
This means flashcards are still failing to save - check the error message

```
ERROR syncWithSupabase: Failed to push local flashcards: [error details]
```
This means the recovery mechanism failed - check the error details

## Additional Tests

### Test 1: New Flashcard Creation
1. Create a new flashcard in any deck
2. Check terminal logs for successful save
3. Background and resume the app
4. Verify the flashcard is still there

### Test 2: Review Completion
1. Start a review session with 5 cards
2. Review ALL 5 cards (don't exit early)
3. Should automatically return to deck screen
4. Should show "All Caught Up!" (this is correct behavior)

### Test 3: Review with AGAIN Rating
1. Start a review session
2. Rate a card as "AGAIN"
3. The card should be requeued to the end of the session
4. Exit the review
5. The "AGAIN" card should still be due (not marked as reviewed)

## Known Limitations

- The fixes will help **prevent future data loss**
- If you already lost flashcards before this fix, they cannot be recovered (they were never saved to the database)
- Users need to restart their app for the fixes to take effect

## Reporting Issues

If you still experience the bug after these fixes, please provide:
1. **Exact steps to reproduce** the issue
2. **Terminal logs** from the time the bug occurred
3. **Number of cards** before and after the bug
4. **What you did** immediately before the bug (reviewed how many cards, how long, etc.)




