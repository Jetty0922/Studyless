# Flashcard Study App

A comprehensive flashcard study app designed for high school students to organize their learning materials and optimize retention through spaced repetition.

## Features

### Onboarding Experience
- **Value Proposition Screen**: Compelling introduction highlighting memory retention benefits
- **How It Works Carousel**: Swipeable 3-card carousel explaining the core workflow:
  - Create cards after class with AI (📸)
  - Set your test date for custom scheduling (📅)
  - Review 10 min daily with reminders (⏰)
- **Account Creation**: Email/password or OAuth (Google, Apple) sign-up options
- **Quick Setup**: Personalized welcome with name and optional school
- **Notification Permission**: Request for daily study reminders
- **First Action Flow**: Option to scan notes immediately or skip to main app
- **Camera Integration**: Full camera interface for scanning notes during onboarding
- **AI Processing**: Real-time progress indicator while generating flashcards from photos
- **Cards Generated Screen**: Preview generated cards, set test date, and name subject before entering app
- **One-Time Display**: Onboarding only shows on first launch

### Simple Organization
- **Decks Tab**: Dedicated tab showing all your decks with mastery progress and card breakdowns
  - **Tab Navigation**: Switch between Test Preparation and Long-Term Memory tabs to view decks by mode
  - **Deck Modes**: Choose between two study modes when creating a deck:
    - **Test Preparation Mode**: Set a test date and cards use intelligent test-date-based scheduling
    - **Long-Term Memory Mode**: Cards start immediately in long-term review (14-day intervals) for building lasting memory
  - **Urgency-Based Design**: Decks with upcoming tests show color-coded borders and badges
    - Red border & "CRITICAL" badge: 3 days or less until test
    - Orange border & "WARNING" badge: 4-7 days until test
    - Blue border: More than 7 days until test
  - **Sorting Options**: Sort decks by Test Date (soonest first), Progress (high to low), or Name (A-Z)
  - **Detailed Progress**: Each deck shows mastery percentage, card breakdown, and test countdown
- **Decks**: Create decks for your study topics (e.g., Cell Structure, Derivatives, World War II)
- **Flashcards**: Individual cards with front (question) and back (answer) directly in decks
- **Custom Colors & Emojis**: Each deck has its own color and optional emoji for visual identification
- **Detailed Deck Cards**: Each deck shows card count, mastery progress bar, and breakdown by mastery level (Mastered/Learning/Struggling)

### Home Dashboard
- **Prominent Study Button**: Large, centered button showing cards due today (6xl text size)
- **Start Studying**: Jump directly into review session with one tap
- **AI Flashcard Generation**: Single green button with modal offering 3 options:
  - Take Photo with camera
  - Upload Image from library
  - Upload File (PDF, documents)
- **Deck Quick Access**: View your decks with due card counts and upcoming tests

### Smart Review System
- **Test-Date-Based Spaced Repetition**: Intelligent scheduling based on days until test to prevent cramming
- **Four Rating Options**:
  - Again: Re-queue in current session
  - Hard: Review tomorrow (doesn't advance step)
  - Good: Advance to next review step
  - Easy: Skip ahead by 2 steps
- **Final Review**: Day before test, review all cards in deck
- **Post-Test Mode**: After test, cards enter long-term retention (14-day intervals)
- **Post-Test Dialog**: Automatic prompts day after test asking how it went and if you want to keep reviewing for finals
- **Progress Tracking**: Visual progress bar during review sessions
- **Due Card Tracking**: See how many cards are ready to review
- **Deck Status System**: Track decks as Active, Long-term, or Archived

### Card Management
- **Deck Views**: View, edit, and delete individual flashcards directly in decks
- **Mastery Breakdown**: Each deck displays cards by mastery level with percentages (Mastered, Learning, Struggling)
- **Sorting Options**: User-selectable sorting:
  - **Decks**: Sort by Test Date, Name (A-Z), or Progress (mastery percentage)
  - **Flashcards**: Sort by Date Created, Mastery Level, or Question (A-Z)
- **Mass Selection**: Select multiple flashcards with checkboxes for bulk operations
- **Bulk Delete**: Delete multiple flashcards at once with confirmation dialog
- **Multiple Input Methods**:
  - Manual text entry
  - Photo capture with camera
  - Photo upload from library
  - File attachment
- **Flexible Organization**: Create flashcards directly in decks
- **Date Tracking**: Automatic timestamping of when cards were created
- **Deck Customization**: Add emoji icons and colors to decks for quick visual identification

### Progress & Statistics
- **Study Streak**: Track current and longest study streaks with fire emoji
- **Weekly Stats**: Cards reviewed this week and average daily reviews
- **Overall Mastery**: Cards categorized into:
  - Mastered ⭐⭐⭐ (at final review step)
  - Learning ⭐⭐ (progressing through steps)
  - Struggling ⭐ (currentStep < 2 and has been reviewed)
- **By Deck**: View mastery percentage and next test dates per deck
- **Review Activity Chart**: Visual 7-day bar chart showing daily review activity
- **Upcoming Tests**: See next 3 tests with readiness percentage (color-coded)

### Settings & Profile
- **User Profile**: View your study statistics and achievements
- **Daily Goals**: Set and monitor daily review targets
- **Theme Toggle**: Switch between dark and light modes (defaults to dark)
- **Notifications**: Manage study reminders (coming soon)
- **Account Settings**: Profile and preferences (coming soon)
- **Data Export**: Download your flashcards (coming soon)
- **Local Storage**: All data securely stored on device
- **Reset Onboarding**: Debug option to view onboarding again

### Modern UI/UX
- **Clean Design**: Following Apple's Human Interface Guidelines
- **Dark/Light Theme**: Full theme support with dark mode as default
- **Color-Coded Decks**: Easy visual identification with custom colors
- **Emoji Icons**: Optional emoji icons for decks (visual identification)
- **Consistent Three-Dot Menus**: Unified edit/settings access across all screens
- **Popup Sort Menus**: Bottom sheet modals for sorting options
- **Visual Hierarchy**: Clear card styles for decks and flashcards
- **D-n Format**: Deck test dates displayed as D-5, D-Day, D+2 for clarity
- **All Caught Up UI**: Celebration screen when no cards are due for review
- **Smooth Animations**: Card flip animations using react-native-reanimated
- **Bottom Tab Navigation**: 4-tab layout for easy access to Home, Decks, Progress, and Settings
- **Modal Presentations**: Native iOS-style modals for card creation
- **Clickable Decks**: Tap decks to view and manage flashcards
- **Selection Mode**: Toggle checkbox mode for multi-select flashcard operations

## Technical Stack

- **Framework**: React Native 0.76.7 with Expo SDK 53
- **Navigation**: React Navigation with native stack and bottom tabs
- **State Management**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind (Tailwind for React Native)
- **Theme System**: Custom theme store with dark/light mode support
- **Animations**: react-native-reanimated v3
- **Date Handling**: date-fns
- **Media**: expo-image-picker, expo-document-picker, expo-camera

## Recent Updates

### Latest Features (Current)
- **Flexible Study Mode Switching**: Complete redesign of how deck modes work
  - **Free Mode Switching**: Switch between Test Prep and Long-Term modes anytime from deck settings
  - **Beautiful Mode Selector**: Side-by-side cards showing Test Prep (school icon, blue theme) and Long-Term (repeat icon, green theme)
  - **No Restrictions**: No longer requires test to pass before enabling long-term mode
  - **Smart Test Date Handling**: Test date field is automatically disabled in long-term mode (not needed)
  - **Bidirectional Conversion**:
    - Switch from Test Prep → Long-Term: Cards reset to step 0, scheduled 14 days out, test date cleared
    - Switch from Long-Term → Test Prep: Cards reset to step 0, scheduled for today, ready to set new test date
  - **Unified Long-Term Behavior**: All long-term decks work identically regardless of how they got there (from test prep or created fresh)
  - **Visual Feedback**: Active mode highlighted with colored border and background
- **Tab Navigation in Decks Screen**: Decks are now organized into two tabs for easier navigation
  - **Test Preparation Tab**: Shows all decks in test prep mode with urgency indicators and countdown timers
  - **Long-Term Memory Tab**: Shows all decks in long-term review mode for building lasting memory
  - Toggle between tabs with a clean, segmented control interface
  - Empty states are context-aware based on the active tab
- **Deck Modes**: Users can now choose between two study modes when creating a deck:
  - **Test Preparation Mode**: For studying with a specific test date in mind. Cards use intelligent test-date-based spaced repetition scheduling
  - **Long-Term Memory Mode**: For building lasting memory without a test deadline. Cards start immediately in long-term review with 14-day intervals
  - Mode selection UI with clear icons and descriptions in the deck creation modal
  - Cards automatically respect their deck's mode and schedule accordingly
- **Complete Review Screen Redesign**: Study interface with proper theme support and clean design
  - **Theme Colors**: Background, text, and progress bar all adapt to dark/light theme
  - **Compact Header**: Smaller close button (24px), thinner progress bar (5px), reduced padding
  - **Better Spacing**: Progress bar and X button positioned properly at top with minimal padding
  - **Colored Button Boxes**: Four rating buttons in actual colored boxes (2x2 grid):
    - Again: Red box (#ef4444) with "10m" interval
    - Hard: Orange box (#f97316) with "1d" interval
    - Good: Green box (#22c55e) with "3d" interval
    - Easy: Blue box (#3b82f6) with "1w" interval
  - **Short Intervals**: Compact notation (10m, 1d, 3d, 1w) instead of long descriptions
  - **No Icons**: Clean, minimal button design with just text and intervals
  - **Higher Buttons**: Buttons positioned higher up with smaller card height (350px) and bottom padding
  - **Centered Layout**: Buttons properly centered in 2x2 grid with proper gap spacing
- **Full Dark Theme Implementation**: Complete dark/light mode support throughout entire app
  - **Dark Mode Default**: App defaults to dark mode on first launch
  - **Theme Toggle**: Easy switch in Settings > Appearance
  - **System-Wide Support**: All screens fully themed including:
    - Home, Subjects, Progress, Settings screens
    - Chapter list screen (SubjectScreen) with proper dark mode
    - Individual chapter screen (ChapterScreen) with dark modals
    - All modals, dialogs, and text inputs adapt to theme
  - **Keyboard Dismissal**: Tap anywhere outside text inputs to dismiss keyboard
  - **Navigation Theming**: Tab bar and headers adapt to theme
  - **Status Bar**: Automatically adjusts for optimal visibility
  - **Persistent Preference**: Theme choice saved in AsyncStorage
- **Improved Modal UX**:
  - **Continuous Card Creation**: Create multiple flashcards without closing modal
  - **Better Positioning**: Create flashcard modal centered instead of bottom sheet
  - **Clear Feedback**: Helper text explaining you can create multiple cards
- **Enhanced Home Screen**:
  - **Centered Study Button**: Large, prominent card with centered layout
  - **Box Design**: Beautiful bordered card with light background showing due cards
  - **Icon Focus**: Large circular icon at top of card for better visual hierarchy
- **Complete Onboarding Redesign**: Comprehensive 10-screen onboarding flow for new users
  - **Value Proposition**: Compelling intro highlighting "50% forgotten in 24 hours" problem
  - **How It Works Carousel**: 3-card swipeable carousel with emoji icons
  - **Authentication**: Full sign-up/sign-in with email/password and OAuth (Google, Apple)
  - **Quick Setup**: Name and school collection with optional skip
  - **Notifications**: Permission request for daily reminders
  - **First Action**: Immediate option to scan notes or skip to main app
  - **Camera Screen**: Full-featured camera with flip and capture
  - **Processing Screen**: Animated progress indicator during AI card generation
  - **Cards Generated**: Preview screen showing created cards, test date picker, and subject naming
  - **Seamless Flow**: Automatic subject/chapter creation and entry into main app
- **User-Selectable Sorting**: Complete sorting system across all screens with popup menus:
  - Subjects: Sort by Name, Card Count, or Chapter Count
  - Chapters: Sort by Test Date, Name, or Progress (mastery percentage)
  - Flashcards: Sort by Date Created, Mastery Level, or Question
  - Clean bottom sheet popup design (not pill buttons)
- **Mass Selection & Bulk Delete**:
  - Toggle selection mode with checkbox icon in header
  - Select individual cards or use "Select All" button
  - Bulk delete with confirmation dialog
  - Visual feedback with blue highlight for selected cards
- **UI Consistency Improvements**:
  - Three-dot menu (ellipsis-vertical) everywhere for edit/settings
  - Removed all long-press interactions
  - Consistent mastery display as percentages (not star emojis)
  - D-n format for chapter test dates (D-5, D-Day, D+2)
- **Mastery Breakdown Per Chapter**: Each chapter displays percentage breakdown of cards by mastery level (Mastered, Learning, Struggling) directly in the subject view
- **Post-Test Flow**: Automatic dialog system that appears the day after a test to:
  - Ask "How was your test?" with emoji responses (😊 Great, 🙂 Good, 😐 Okay, 😞 Bad)
  - Follow-up dialog asking "Keep reviewing for finals?" with explanation
  - Options to enable long-term mode (14-day reviews) or archive the chapter
- **Chapter Status Badges**: Visual badges showing chapter status:
  - **Active** (blue): Currently preparing for test
  - **Long-term** (green): In long-term review mode (every 2 weeks)
  - **Archived** (gray): Test completed, not reviewing
- **Emoji Mascots for Subjects**: Add optional emoji icons to subjects for quick visual identification
  - 24 preset emoji options (books, graduation cap, science icons, etc.)
  - Editable in subject settings
  - Displayed prominently on subject cards
- **All Caught Up UI**: Celebration screen with confetti emoji when no cards are due
- **Visual Hierarchy**: Distinct card styles for subjects (large with shadows), chapters (medium with borders), and sections (simple with chevrons)

### Bug Fixes & Improvements (Latest)
- **Test Date Validation**: Date picker now correctly prevents selecting dates before today
- **Test Categorization**: Progress screen now has filter tabs to view tests by status:
  - Upcoming: Tests that haven't happened yet
  - Finished: Tests that have already occurred
  - All: View all tests regardless of status
- **Study Logic Fix**: Fixed critical bug where flashcards weren't properly moving off the due list after studying
  - Cards reviewed late (after their scheduled date) now correctly calculate next review from today
  - Prevents cards from staying stuck in the "due" state even after being studied
  - Ensures proper progression through the spaced repetition schedule

### Complete App Redesign
- **HomeScreen Simplified**: Streamlined to essential features only
  - Start Studying card with due count and quick access button
  - Generate Flashcards button for AI-powered card creation
  - Your Decks section showing decks with due cards
  - Upcoming Tests section showing next 3 tests with readiness percentages
  - Removed unnecessary stats and visual clutter
  - Clean, compact header with just "Home" title

- **ProgressScreen Redesigned**: Focused on meaningful metrics
  - Removed streak tracking system entirely
  - Compact header without excessive spacing
  - This Week stats (cards reviewed, daily average)
  - Overall Mastery breakdown (Mastered/Learning/Struggling)
  - By Deck progress tracking
  - Review Activity chart (last 7 days)
  - Upcoming Tests with readiness indicators
  - All sections in clean white cards with consistent spacing

- **SettingsScreen Simplified**: Professional, minimal interface
  - Removed large profile card with gradient
  - Clean header with just "Settings" title
  - General section (Notifications, Account, Daily Goal)
  - Data & Privacy section (Export Data, Local Storage)
  - About section (App Info, Help & Support)
  - All settings in compact, organized cards

### Complete UI Polish & Professional Design
- **All screens redesigned** with professional, polished UI following Apple's Human Interface Guidelines
- **Consistent design system across all screens**:
  - Gray backgrounds (bg-gray-50) with white cards for better visual hierarchy
  - Subtle shadows with proper elevation for depth
  - Increased padding (px-6 py-6) for better spacing and breathing room
  - Larger, bolder headings (text-4xl) with descriptive subtitles
  - Professional Ionicons instead of text emojis

**ProgressScreen:**
- Redesigned streak card with Ionicons flame icon (no more floating emoji)
- Added "Best Streak" and "Today" quick stats in streak card
- Improved all section headers (removed ALL CAPS for better readability)
- Enhanced chart styling with bold font-weight on counts
- Consistent card design with shadows and rounded corners

**SettingsScreen:**
- Integrated quick stats into profile card (Current Streak with flame icon, Best Streak, Today's Progress)
- Removed redundant "Stats Summary" section for cleaner design
- Better visual hierarchy with larger text and improved spacing
- Professional card shadows throughout

- **Enhanced Home Screen**:
  - **Centered Study Button**: Large, prominent card with centered layout
  - **Box Design**: Beautiful bordered card with light background showing due cards
  - **Icon Focus**: Large circular icon at top of card for better visual hierarchy

### Previous UI/UX Improvements
- **Home Screen Redesign**: More welcoming home screen with prominent Start Studying button
  - Large card showing due cards count (7xl font size)
  - Enhanced Start Studying button with clear call-to-action
  - Quick stats section showing Decks, Total Cards, and Mastered cards
  - Redesigned Generate Flashcards button with better visual hierarchy
  - Improved decks overview with test information
- **Navigation Improvements**: Native stack headers with automatic back buttons on Deck screens
- **Deck Creation Simplified**: Streamlined deck creation process
  - Add deck name, color, emoji, and optional test date
  - Automatically uses current date internally
  - Streamlined card creation flow

### Major Overhaul: Test-Date-Based Spaced Repetition System
- Replaced SM-2 algorithm with custom test-date-based system
- Schedule calculation based on days until test (prevents cramming)
- Added "Again" rating that re-queues cards in current session
- Final review feature (day before test)
- Post-test long-term retention mode (14-day intervals)
- Data migration for existing cards

### Home Screen Redesign
- Large, prominent "Start Studying" button with text-6xl due count
- Single "Generate Flashcards" button opening modal with 3 options
- Removed total cards section for cleaner interface

### Progress Screen Complete Redesign
- Study Streak with flame emoji in gradient card
- Weekly Stats: cards reviewed and average daily
- Overall Mastery breakdown: Mastered ⭐⭐⭐, Learning ⭐⭐, Struggling ⭐
- By Deck section with mastery percentages and next test dates
- Review Activity bar chart (last 7 days with today highlighted)
- Upcoming Tests with readiness percentage (color-coded)

### UI Updates
- Streamlined deck creation and management
- Updated button labels for clarity throughout app

### Bug Fixes
- Fixed infinite render loop in DeckScreen
- Optimized Zustand selectors to prevent unnecessary re-renders by:
  - Using individual primitive selectors instead of calling functions in selectors
  - Computing derived values outside of selectors to avoid creating new object references on every render
  - Following Zustand best practices for preventing infinite loops
- Fixed date picker behavior on iOS with "Done" button
- Added optional chaining for backward compatibility with old card format

## App Structure

```
src/
├── components/       # Reusable components
│   ├── PostTestDialog.tsx       # Post-test dialogs (how was test, long-term mode)
│   └── SortMenu.tsx             # Reusable bottom sheet sort menu
├── screens/
│   # Onboarding Screens
│   ├── ValuePropScreen.tsx      # Opening value proposition screen
│   ├── HowItWorksScreen.tsx     # Swipeable 3-card carousel
│   ├── CreateAccountScreen.tsx  # Sign-up with email/OAuth
│   ├── SignInScreen.tsx         # Login screen
│   ├── QuickSetupScreen.tsx     # Name and school collection
│   ├── NotificationsSetupScreen.tsx # Notification permission request
│   ├── FirstActionScreen.tsx    # Scan notes or skip to app
│   ├── CameraScreen.tsx         # Full camera interface for note scanning
│   ├── ProcessingScreen.tsx     # AI processing with progress indicator
│   ├── CardsGeneratedScreen.tsx # Preview cards, set test date, name deck
│   # Main App Screens
│   ├── HomeScreen.tsx           # Dashboard with study overview and AI upload
│   ├── DecksListScreen.tsx      # All decks overview with mastery progress
│   ├── DeckScreen.tsx           # Flashcard list with edit/delete/sorting/mass selection
│   ├── DeckSettingsScreen.tsx   # Deck settings and long-term mode toggle
│   ├── ReviewScreen.tsx         # Flip card review interface
│   ├── ProgressScreen.tsx       # Weekly stats and charts
│   └── SettingsScreen.tsx       # User profile and app settings
├── navigation/
│   └── RootNavigator.tsx        # Navigation setup with onboarding stack and main tabs
├── state/
│   ├── flashcardStore.ts        # Zustand store with persistence
│   └── themeStore.ts            # Theme state management (dark/light mode)
├── types/
│   ├── flashcard.ts             # TypeScript interfaces
│   └── ai.ts                    # AI service types
├── api/
│   ├── chat-service.ts          # AI text generation
│   ├── openai.ts                # OpenAI client
│   └── anthropic.ts             # Anthropic client
└── utils/
    ├── cn.ts                     # Tailwind class merger
    ├── useTheme.ts              # Theme hook for accessing colors
    ├── spacedRepetition.ts      # Test-date-based spaced repetition logic
    ├── sampleData.ts            # Sample data loader
    └── aiFlashcardGenerator.ts  # AI flashcard generation
```

## Data Model

### Deck
- Name, color, emoji (optional icon), test date (optional for long-term decks), status (active/in-progress/completed), card count, due cards, mode (TEST_PREP or LONG_TERM)

### Flashcard
- Front, back, optional image/file
- Test-date-based spaced repetition metadata:
  - schedule: Array of review days from creation (e.g., [0, 2, 7, 14, 21])
  - currentStep: Current position in schedule
  - mode: "TEST_PREP" or "LONG_TERM"
  - testDate: Associated test date
- Next review date
- deckId: Parent deck reference

### Study Stats
- Current streak, longest streak
- Total cards reviewed, daily goal
- Cards reviewed today

## Spaced Repetition Algorithm

The app implements a custom test-date-based spaced repetition system designed to prevent cramming:

### Schedule Calculation
Based on days until test, the schedule is calculated:
- **≥21 days**: [0, 2, 7, 14, 21] - Full schedule with 5 review sessions
- **≥14 days**: [0, 1, 3, 7, 14] - Compressed schedule
- **≥7 days**: [0, 1, 3, 7] - 4 reviews
- **≥4 days**: [0, 1, 3] - 3 reviews
- **≥2 days**: [0, 1] - 2 reviews
- **<2 days**: [0] - Single review

### Review Ratings
1. **Again**: Card stays in today's queue, re-queued for same session
2. **Hard**: Review tomorrow, doesn't advance currentStep
3. **Good**: Advance currentStep by 1, schedule next review per schedule array
4. **Easy**: Advance currentStep by 2, skip ahead in schedule

### Special Features
- **Final Review**: Day before test, all chapter cards become due regardless of schedule
- **Post-Test Mode**: After test, cards convert to LONG_TERM mode with 14-day intervals
- **Date Capping**: Review dates never scheduled past the day before test

## Getting Started

### First Launch Onboarding
On first launch, new users go through a comprehensive 10-screen onboarding flow:

1. **Value Proposition**: Learn about memory retention and the app's benefits
2. **How It Works**: Swipe through 3 cards explaining the workflow (📸 Create, 📅 Schedule, ⏰ Review)
3. **Create Account**: Sign up with email/password or OAuth (Google/Apple)
4. **Quick Setup**: Enter your name and optional school
5. **Notifications**: Enable daily study reminders (or skip)
6. **First Action**: Choose to scan notes immediately or skip to main app

If you choose to scan notes:
7. **Camera**: Take a photo of your class notes
8. **Processing**: Watch AI generate flashcards (animated progress indicator)
9. **Cards Generated**: Preview cards, set test date, and name the subject
10. **Main App**: Automatically creates subject/chapter and enters main app

You can skip steps at any time by tapping "Skip" buttons.

### Sample Data
On first launch, tap "Load Sample Data" on the home screen to populate the app with example decks and flashcards for Cell Structure, Derivatives, World War II, and Periodic Table.

### Creating Your Own Content
1. Tap "Generate Flashcards" on the Home screen or create a new deck
2. Choose a name, color, and emoji for your deck
3. Add a test date if preparing for an exam
4. Create flashcards by tapping "Create Flashcard" in the deck
5. Enter question and answer content
6. Start reviewing when cards are due from Home screen

## Navigation Flow

```
Bottom Tabs (4 tabs)
├── Home Tab
│   ├── Dashboard with study overview
│   ├── AI flashcard generation upload
│   └── Quick deck access → Deck Screen
│       ├── Flashcard management (view/edit/delete/create)
│       └── Review (Full Screen Modal)
├── Decks Tab
│   ├── View all decks with urgency-based color coding
│   ├── Sort by test date, progress, or name
│   ├── See mastery progress for each deck
│   └── Quick access to any deck → Deck Screen
├── Progress Tab
│   └── Weekly charts and statistics
└── Settings Tab
    └── Profile, goals, and app settings
```

## Key Features for Students

1. **Test Preparation**: Track upcoming test dates and organize study materials by deck with intelligent scheduling
2. **No Cramming**: Spaced repetition system ensures reviews start early and spread out based on test date
3. **Visual Learning**: Attach photos to flashcards for diagrams, formulas, or visual content
4. **Motivation**: Daily goals, streak tracking with fire emoji, and progress charts encourage consistent study habits
5. **Efficiency**: Test-date-based spaced repetition ensures you review cards at optimal times
6. **Simple Organization**: Flat structure with decks containing flashcards - no complex hierarchy
7. **Progress Visibility**: Comprehensive progress tracking with mastery levels and weekly activity charts
8. **AI Assistance**: Upload study materials for automatic flashcard generation (coming soon)
9. **Flexible Management**: View, edit, and delete individual cards directly in decks
10. **Readiness Tracking**: See exactly how ready you are for upcoming tests with percentage indicators
11. **Sorting & Organization**: Sort decks and flashcards by multiple criteria with popup menus
12. **Bulk Operations**: Mass select and delete multiple flashcards at once with checkbox selection mode

## Recent Updates

## Future Enhancements

- **AI Flashcard Generation**: Complete implementation of image-to-flashcard conversion using vision AI
- **Backend Sync**: Multi-device support with cloud synchronization
- **Shared Decks**: Share flashcard decks between students
- **Audio Recording**: Voice recording for language learning
- **Export/Import**: Deck export and import functionality
- **Advanced Analytics**: Detailed performance analytics and insights
- **Smart Notifications**: Study reminders based on due cards and optimal review times
- **Tag System**: Tag-based organization for cross-subject topics
- **Search**: Global search across all flashcards
- **Study Groups**: Collaborative study features
- **Automatic Long-Term Conversion**: Auto-convert cards to long-term mode after test date

## Notes

This is a frontend-only implementation with local storage. All data persists on the device using AsyncStorage through Zustand middleware.

The app is optimized for iOS but compatible with Android. UI follows iOS design patterns including native modal presentations and smooth animations.
