/**
 * Load Balancer - Workload Smoothing and Easy Days
 * 
 * Implements intelligent workload distribution to prevent:
 * 1. "Clustering" - many cards due on the same day
 * 2. "Spiky" workloads that demotivate users
 * 3. Overwhelming catch-up after vacations
 * 
 * Features:
 * - Easy Days: Reduced load on weekends/holidays
 * - Workload Forecast: See future review load
 * - Catch-Up Mode: Spread backlog over multiple days
 * - Load Redistribution: Move excess cards to adjacent days
 */

import { addDays, startOfDay, format, differenceInDays } from 'date-fns';
import { Flashcard, EasyDay } from '../types/flashcard';
import { getCardRetrievability } from './retrievability';
import { NEW_CARDS_PER_DAY, REVIEWS_PER_DAY } from './spacedRepetition';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface LoadBalanceConfig {
  /** Maximum cards per day (0 = unlimited) */
  defaultMaxPerDay: number;
  /** Days with reduced load */
  easyDays: EasyDay[];
  /** Whether to enable load balancing */
  enableBalancing: boolean;
  /** New cards per day limit */
  newCardsPerDay: number;
  /** Review cards per day limit (0 = unlimited) */
  reviewsPerDay: number;
}

export const DEFAULT_LOAD_CONFIG: LoadBalanceConfig = {
  defaultMaxPerDay: 100,
  easyDays: [],
  enableBalancing: true,
  newCardsPerDay: NEW_CARDS_PER_DAY,
  reviewsPerDay: REVIEWS_PER_DAY
};

// ============================================================================
// DAILY WORKLOAD TYPES
// ============================================================================

export interface DailyWorkload {
  date: Date;
  dateKey: string;
  scheduledCards: number;
  newCards: number;
  reviewCards: number;
  maxCards: number;
  isOverloaded: boolean;
  isEasyDay: boolean;
  loadPercent: number;
}

// ============================================================================
// EASY DAY DETECTION
// ============================================================================

/**
 * Check if a date is an easy day
 * 
 * @param date - Date to check
 * @param easyDays - Array of easy day configurations
 * @returns Matching EasyDay config or undefined
 */
export function isEasyDay(
  date: Date,
  easyDays: EasyDay[]
): EasyDay | undefined {
  const dayOfWeek = date.getDay();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return easyDays.find(ed => {
    // Check specific date first
    if (ed.date) {
      const edDateStr = format(ed.date instanceof Date ? ed.date : new Date(ed.date), 'yyyy-MM-dd');
      if (edDateStr === dateStr) return true;
    }
    // Check day of week
    if (ed.dayOfWeek !== undefined && ed.dayOfWeek === dayOfWeek) {
      return true;
    }
    return false;
  });
}

/**
 * Get maximum cards for a specific date
 * 
 * @param date - Date to check
 * @param config - Load balance configuration
 * @returns Maximum cards allowed for this date
 */
export function getMaxCardsForDate(
  date: Date,
  config: LoadBalanceConfig
): number {
  const easyDay = isEasyDay(date, config.easyDays);
  if (easyDay) {
    return easyDay.maxCards;
  }
  return config.defaultMaxPerDay || Infinity;
}

// ============================================================================
// WORKLOAD FORECAST
// ============================================================================

/**
 * Generate workload forecast for next N days
 * 
 * @param cards - All flashcards
 * @param days - Number of days to forecast
 * @param config - Load balance configuration
 * @returns Array of daily workload summaries
 */
export function getWorkloadForecast(
  cards: Flashcard[],
  days: number = 14,
  config: LoadBalanceConfig = DEFAULT_LOAD_CONFIG
): DailyWorkload[] {
  const forecast: DailyWorkload[] = [];
  const today = startOfDay(new Date());
  
  // Count cards per day
  const cardCounts = new Map<string, { total: number; new: number; review: number }>();
  
  cards.forEach(card => {
    const dueDate = startOfDay(new Date(card.nextReviewDate));
    const dateKey = format(dueDate, 'yyyy-MM-dd');
    
    const existing = cardCounts.get(dateKey) || { total: 0, new: 0, review: 0 };
    existing.total++;
    
    if (card.learningState === 'GRADUATED') {
      existing.review++;
    } else {
      existing.new++;
    }
    
    cardCounts.set(dateKey, existing);
  });
  
  // Generate forecast
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');
    const counts = cardCounts.get(dateKey) || { total: 0, new: 0, review: 0 };
    const maxCards = getMaxCardsForDate(date, config);
    
    forecast.push({
      date,
      dateKey,
      scheduledCards: counts.total,
      newCards: counts.new,
      reviewCards: counts.review,
      maxCards,
      isOverloaded: counts.total > maxCards,
      isEasyDay: isEasyDay(date, config.easyDays) !== undefined,
      loadPercent: maxCards > 0 ? Math.round((counts.total / maxCards) * 100) : 0
    });
  }
  
  return forecast;
}

/**
 * Get summary statistics for workload forecast
 * 
 * @param forecast - Workload forecast array
 * @returns Summary statistics
 */
export function getWorkloadStats(forecast: DailyWorkload[]): {
  totalCards: number;
  averagePerDay: number;
  peakDay: DailyWorkload | undefined;
  overloadedDays: number;
  easyDays: number;
} {
  const totalCards = forecast.reduce((sum, d) => sum + d.scheduledCards, 0);
  const avgPerDay = forecast.length > 0 ? totalCards / forecast.length : 0;
  const peakDay = forecast.reduce((max, d) => 
    d.scheduledCards > (max?.scheduledCards || 0) ? d : max, 
    undefined as DailyWorkload | undefined
  );
  const overloadedDays = forecast.filter(d => d.isOverloaded).length;
  const easyDaysCount = forecast.filter(d => d.isEasyDay).length;
  
  return {
    totalCards,
    averagePerDay: Math.round(avgPerDay),
    peakDay,
    overloadedDays,
    easyDays: easyDaysCount
  };
}

// ============================================================================
// LOAD BALANCING
// ============================================================================

export interface CardReassignment {
  cardId: string;
  originalDate: string;
  newDate: string;
  reason: 'OVERLOAD' | 'EASY_DAY';
}

/**
 * Balance workload by redistributing cards from overloaded days
 * 
 * @param cards - All flashcards
 * @param config - Load balance configuration
 * @returns Map of card reassignments
 */
export function balanceWorkload(
  cards: Flashcard[],
  config: LoadBalanceConfig = DEFAULT_LOAD_CONFIG
): CardReassignment[] {
  if (!config.enableBalancing) {
    return [];
  }
  
  const reassignments: CardReassignment[] = [];
  const forecast = getWorkloadForecast(cards, 60, config);
  
  // Build card lookup by date
  const cardsByDate = new Map<string, Flashcard[]>();
  cards.forEach(card => {
    const dateKey = format(startOfDay(new Date(card.nextReviewDate)), 'yyyy-MM-dd');
    const existing = cardsByDate.get(dateKey) || [];
    existing.push(card);
    cardsByDate.set(dateKey, existing);
  });
  
  // Track capacity usage
  const capacityUsed = new Map<string, number>();
  forecast.forEach(day => {
    capacityUsed.set(day.dateKey, day.scheduledCards);
  });
  
  // Find overloaded days and redistribute
  for (const day of forecast) {
    if (!day.isOverloaded) continue;
    
    const dayCards = cardsByDate.get(day.dateKey) || [];
    const excess = dayCards.length - day.maxCards;
    if (excess <= 0) continue;
    
    // Sort by stability (highest first - can wait longest)
    const sortedCards = [...dayCards].sort((a, b) => 
      (b.stability || 0) - (a.stability || 0)
    );
    
    // Move excess cards to adjacent days
    const cardsToMove = sortedCards.slice(0, excess);
    
    for (const card of cardsToMove) {
      // Find next available day with capacity
      for (let offset = 1; offset <= 7; offset++) {
        const targetDate = addDays(new Date(day.dateKey), offset);
        const targetKey = format(targetDate, 'yyyy-MM-dd');
        
        const targetDay = forecast.find(d => d.dateKey === targetKey);
        if (!targetDay) continue;
        
        const currentUsage = capacityUsed.get(targetKey) || 0;
        if (currentUsage < targetDay.maxCards) {
          reassignments.push({
            cardId: card.id,
            originalDate: day.dateKey,
            newDate: targetKey,
            reason: 'OVERLOAD'
          });
          capacityUsed.set(targetKey, currentUsage + 1);
          break;
        }
      }
    }
  }
  
  return reassignments;
}

/**
 * Apply reassignments to cards
 * 
 * @param cards - All flashcards
 * @param reassignments - Reassignment map
 * @returns Updated cards with new dates
 */
export function applyReassignments(
  cards: Flashcard[],
  reassignments: CardReassignment[]
): Map<string, Partial<Flashcard>> {
  const updates = new Map<string, Partial<Flashcard>>();
  
  const reassignmentMap = new Map<string, CardReassignment>();
  reassignments.forEach(r => reassignmentMap.set(r.cardId, r));
  
  cards.forEach(card => {
    const reassignment = reassignmentMap.get(card.id);
    if (reassignment) {
      const newDate = new Date(reassignment.newDate);
      newDate.setHours(4, 0, 0, 0);  // Set to 4 AM
      
      updates.set(card.id, {
        nextReviewDate: newDate,
        originalDueDate: card.nextReviewDate  // Preserve original
      });
    }
  });
  
  return updates;
}

// ============================================================================
// CATCH-UP MODE
// ============================================================================

export interface CatchUpSchedule {
  date: Date;
  dateKey: string;
  cards: Flashcard[];
  count: number;
}

/**
 * Generate catch-up schedule for overdue cards
 * Spreads backlog over multiple days prioritizing by urgency (lowest R first)
 * 
 * @param overdueCards - Cards that are overdue
 * @param catchUpDays - Number of days to spread catch-up over
 * @param maxPerDay - Maximum cards per day during catch-up
 * @returns Catch-up schedule
 */
export function getCatchUpSchedule(
  overdueCards: Flashcard[],
  catchUpDays: number = 7,
  maxPerDay: number = 50
): CatchUpSchedule[] {
  // Sort by retrievability (lowest first - most urgent)
  const sorted = [...overdueCards].sort((a, b) => {
    const rA = getCardRetrievability(a);
    const rB = getCardRetrievability(b);
    return rA - rB;
  });
  
  const schedule: CatchUpSchedule[] = [];
  const today = startOfDay(new Date());
  
  // Initialize schedule for each day
  for (let i = 0; i < catchUpDays; i++) {
    const date = addDays(today, i);
    schedule.push({
      date,
      dateKey: format(date, 'yyyy-MM-dd'),
      cards: [],
      count: 0
    });
  }
  
  // Distribute cards
  sorted.forEach((card, index) => {
    const dayIndex = Math.floor(index / maxPerDay);
    if (dayIndex < catchUpDays) {
      schedule[dayIndex].cards.push(card);
      schedule[dayIndex].count++;
    }
  });
  
  return schedule;
}

/**
 * Get overdue card summary
 * 
 * @param cards - All flashcards
 * @returns Summary of overdue cards
 */
export function getOverdueSummary(cards: Flashcard[]): {
  count: number;
  urgentCount: number;  // R < 50%
  oldestDaysOverdue: number;
  averageR: number;
  recommendation: string;
} {
  const now = new Date();
  const overdueCards = cards.filter(c => new Date(c.nextReviewDate) < now);
  
  if (overdueCards.length === 0) {
    return {
      count: 0,
      urgentCount: 0,
      oldestDaysOverdue: 0,
      averageR: 1,
      recommendation: 'All caught up!'
    };
  }
  
  let urgentCount = 0;
  let totalR = 0;
  let maxDaysOverdue = 0;
  
  overdueCards.forEach(card => {
    const r = getCardRetrievability(card);
    totalR += r;
    if (r < 0.5) urgentCount++;
    
    const daysOverdue = differenceInDays(now, new Date(card.nextReviewDate));
    maxDaysOverdue = Math.max(maxDaysOverdue, daysOverdue);
  });
  
  const avgR = totalR / overdueCards.length;
  
  let recommendation: string;
  if (overdueCards.length <= 20) {
    recommendation = 'Manageable backlog. Clear it in one session.';
  } else if (overdueCards.length <= 100) {
    recommendation = `Spread over ${Math.ceil(overdueCards.length / 30)} days for best retention.`;
  } else {
    recommendation = 'Large backlog. Use catch-up mode to avoid burnout.';
  }
  
  return {
    count: overdueCards.length,
    urgentCount,
    oldestDaysOverdue: maxDaysOverdue,
    averageR: avgR,
    recommendation
  };
}

// ============================================================================
// NEW CARDS LIMITING
// ============================================================================

/**
 * Get new cards for today respecting daily limit
 * 
 * @param cards - All flashcards
 * @param deckId - Deck to get new cards for
 * @param limit - Maximum new cards (default from config)
 * @param order - Insertion order (SEQUENTIAL or RANDOM)
 * @returns Array of new cards for today
 */
export function getNewCardsForToday(
  cards: Flashcard[],
  deckId: string,
  limit: number = NEW_CARDS_PER_DAY,
  order: 'SEQUENTIAL' | 'RANDOM' = 'SEQUENTIAL'
): Flashcard[] {
  const newCards = cards.filter(c => 
    c.deckId === deckId && 
    c.learningState === 'LEARNING' && 
    c.reps === 0
  );
  
  // Sort by creation date for sequential
  let sorted = [...newCards].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Shuffle if random order
  if (order === 'RANDOM') {
    sorted = shuffleArray(sorted);
  }
  
  return sorted.slice(0, limit);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// EASY DAYS PRESETS
// ============================================================================

/**
 * Create weekend easy days configuration
 * 
 * @param maxCards - Maximum cards on weekends
 * @returns Easy day configurations for Saturday and Sunday
 */
export function createWeekendEasyDays(maxCards: number = 10): EasyDay[] {
  return [
    { dayOfWeek: 0, maxCards },  // Sunday
    { dayOfWeek: 6, maxCards }   // Saturday
  ];
}

/**
 * Create holiday easy day
 * 
 * @param date - Holiday date
 * @param maxCards - Maximum cards on this day
 * @returns Easy day configuration
 */
export function createHolidayEasyDay(date: Date, maxCards: number = 0): EasyDay {
  return { date, maxCards };
}

