/**
 * Analytics Service
 * 
 * Real Mixpanel implementation for production analytics tracking.
 * 
 * Setup:
 * 1. Create account at mixpanel.com
 * 2. Get your project token from: Project Settings → Access Keys → Token
 * 3. Add to .env: EXPO_PUBLIC_MIXPANEL_TOKEN=your-token-here
 */

import { Mixpanel } from 'mixpanel-react-native';

// Initialize Mixpanel
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

let mixpanel: Mixpanel | null = null;

// Initialize Mixpanel (call this once at app startup)
export async function initAnalytics(): Promise<void> {
  if (!MIXPANEL_TOKEN) {
    if (__DEV__) {
      console.log('[Analytics] Mixpanel token not configured. Analytics disabled.');
    }
    return;
  }

  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // true = track automatically
    await mixpanel.init();
    
    if (__DEV__) {
      console.log('[Analytics] Mixpanel initialized successfully');
    }
  } catch (error) {
    console.error('[Analytics] Failed to initialize Mixpanel:', error);
    mixpanel = null;
  }
}

/**
 * Track when a user signs up
 * @param method - The signup method used (e.g., 'email', 'google', 'apple')
 */
export function trackUserSignedUp(method: 'email' | 'google' | 'apple'): void {
  if (__DEV__) {
    console.log('[Analytics] User signed up via:', method);
  }
  
  mixpanel?.track('User Signed Up', { method });
}

/**
 * Identify a user for analytics tracking
 * @param userId - The unique user ID
 */
export function identifyUser(userId: string): void {
  if (__DEV__) {
    console.log('[Analytics] User identified:', userId);
  }
  
  mixpanel?.identify(userId);
}

/**
 * Track a generic event
 * @param eventName - Name of the event
 * @param properties - Optional event properties
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (__DEV__) {
    console.log('[Analytics] Event:', eventName, properties || {});
  }
  
  mixpanel?.track(eventName, properties);
}

/**
 * Set user properties (persist across sessions)
 * @param properties - User properties to set
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (__DEV__) {
    console.log('[Analytics] Set user properties:', properties);
  }
  
  if (mixpanel) {
    Object.entries(properties).forEach(([key, value]) => {
      mixpanel?.getPeople().set(key, value);
    });
  }
}

/**
 * Track screen views
 * @param screenName - Name of the screen
 */
export function trackScreenView(screenName: string): void {
  if (__DEV__) {
    console.log('[Analytics] Screen view:', screenName);
  }
  
  mixpanel?.track('Screen View', { screen_name: screenName });
}

/**
 * Reset analytics (call on sign out)
 */
export function resetAnalytics(): void {
  if (__DEV__) {
    console.log('[Analytics] Analytics reset');
  }
  
  mixpanel?.reset();
}

// ============================================================================
// Recommended Events to Track in Your App
// ============================================================================

/**
 * Track deck creation
 */
export function trackDeckCreated(deckId: string, hasTestDate: boolean): void {
  trackEvent('Deck Created', {
    deck_id: deckId,
    has_test_date: hasTestDate,
  });
}

/**
 * Track flashcard creation
 */
export function trackFlashcardsCreated(
  count: number, 
  source: 'manual' | 'ai_image' | 'ai_pdf' | 'ai_text'
): void {
  trackEvent('Flashcards Created', {
    count,
    source,
  });
}

/**
 * Track review session
 */
export function trackReviewCompleted(
  cardCount: number, 
  duration: number, 
  ratings: { again: number; hard: number; good: number; easy: number }
): void {
  trackEvent('Review Completed', {
    card_count: cardCount,
    duration_seconds: duration,
    ...ratings,
  });
}

/**
 * Track AI generation
 */
export function trackAIGeneration(
  source: 'image' | 'pdf' | 'text',
  success: boolean,
  cardCount?: number,
  error?: string
): void {
  trackEvent('AI Generation', {
    source,
    success,
    card_count: cardCount,
    error: error?.substring(0, 100), // Truncate long errors
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(feature: string): void {
  trackEvent('Feature Used', { feature });
}
