/**
 * Exam Scheduler - 3-Phase Finite Horizon Optimization
 * 
 * Implements the "Finite Horizon Controller" that overlays the FSRS memory model
 * to optimize retention at a specific exam date.
 * 
 * Phases:
 * 1. MAINTENANCE (>30 days): Minimum effort, R_target = 75%
 * 2. CONSOLIDATION (7-30 days): Ramp up stability, R_target = 75-95%
 * 3. CRAM (1-7 days): Maximize R at exam, sort by R_exam
 * 
 * Based on Leitner Queue Network theory and RemNote exam scheduler.
 */

import { differenceInDays } from 'date-fns';
import { Flashcard, Deck, ExamPhase, MasteryLevel } from '../types/flashcard';
import { 
  getCardRetrievability, 
  projectRetrievabilityAtDate,
  sortByRAtExam 
} from './retrievability';

// ============================================================================
// EXAM PHASE CONFIGURATION
// ============================================================================

export interface ExamPhaseConfig {
  phase: ExamPhase;
  daysLeft: number;
  targetRetention: number;
  strategy: string;
}

// ============================================================================
// PHASE DETECTION
// ============================================================================

/**
 * Determine current exam phase based on days until test
 * 
 * @param testDate - The exam date
 * @returns Phase configuration with target retention
 */
export function getExamPhase(testDate: Date): ExamPhaseConfig {
  const now = new Date();
  // Normalize to midnight to compare calendar days, not 24h periods
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const testMidnight = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
  const daysLeft = differenceInDays(testMidnight, todayMidnight);
  
  if (daysLeft < 0) {
    return {
      phase: 'POST_EXAM',
      daysLeft,
      targetRetention: 0.90,
      strategy: 'Convert to LONG_TERM mode or archive'
    };
  }
  
  if (daysLeft === 0) {
    return {
      phase: 'EXAM_DAY',
      daysLeft: 0,
      targetRetention: 1.0,
      strategy: 'Emergency review of struggling cards only'
    };
  }
  
  if (daysLeft <= 7) {
    // CRAM phase: 95% → 99% as exam approaches
    const targetR = 0.95 + (0.04 * (7 - daysLeft) / 7);
    return {
      phase: 'CRAM',
      daysLeft,
      targetRetention: targetR,
      strategy: 'Maximize R at exam time, sort by R_exam'
    };
  }
  
  if (daysLeft <= 30) {
    // CONSOLIDATION phase: Linear interpolation 75% → 95%
    const t = (30 - daysLeft) / 23;
    const targetR = 0.75 + (0.95 - 0.75) * t;
    
    return {
      phase: 'CONSOLIDATION',
      daysLeft,
      targetRetention: targetR,
      strategy: 'Gradually tighten intervals, build stability'
    };
  }
  
  // MAINTENANCE phase: >30 days
  return {
    phase: 'MAINTENANCE',
    daysLeft,
    targetRetention: 0.75,
    strategy: 'Minimum effort, allow R to drop to 75%'
  };
}

/**
 * Update deck with current exam phase
 * 
 * @param deck - Deck to update
 * @returns Updated deck with examPhase
 */
export function updateDeckExamPhase(deck: Deck): Partial<Deck> {
  if (deck.mode !== 'TEST_PREP' || !deck.testDate) {
    return { examPhase: undefined };
  }
  
  const config = getExamPhase(new Date(deck.testDate));
  return { examPhase: config.phase };
}

// ============================================================================
// CARD PRIORITIZATION BY PHASE
// ============================================================================

/**
 * Get cards prioritized for current exam phase
 * 
 * @param cards - All cards in deck
 * @param deck - The deck with testDate
 * @returns Cards sorted by phase-specific priority
 */
export function getExamPhaseCards(
  cards: Flashcard[],
  deck: Deck
): Flashcard[] {
  if (!deck.testDate) return cards;
  
  const config = getExamPhase(new Date(deck.testDate));
  
  switch (config.phase) {
    case 'MAINTENANCE':
      // Only cards with R < 75%
      return cards
        .filter(c => getCardRetrievability(c) < config.targetRetention)
        .sort((a, b) => getCardRetrievability(a) - getCardRetrievability(b));
    
    case 'CONSOLIDATION':
      // Cards with R < target (increasing threshold)
      return cards
        .filter(c => getCardRetrievability(c) < config.targetRetention)
        .sort((a, b) => getCardRetrievability(a) - getCardRetrievability(b));
    
    case 'CRAM':
      // Sort by projected R at exam (lowest first)
      return sortByRAtExam(cards, new Date(deck.testDate));
    
    case 'EXAM_DAY':
      // Only struggling cards
      return cards.filter(c => c.mastery === 'STRUGGLING');
    
    case 'POST_EXAM':
      return [];  // Trigger post-exam dialog
  }
}

/**
 * Filter cards that need review based on exam phase
 * 
 * @param cards - All cards in deck
 * @param deck - The deck with testDate
 * @returns Cards that need review based on phase
 */
export function getCardsNeedingReview(
  cards: Flashcard[],
  deck: Deck
): Flashcard[] {
  if (!deck.testDate) return cards;
  
  const config = getExamPhase(new Date(deck.testDate));
  
  // Filter by R threshold
  return cards.filter(card => {
    const r = getCardRetrievability(card);
    return r < config.targetRetention;
  });
}

// ============================================================================
// EXAM PREPAREDNESS
// ============================================================================

export interface ExamPreparedness {
  phase: ExamPhase;
  daysLeft: number;
  totalCards: number;
  readyCards: number;      // R_exam >= 90%
  atRiskCards: number;     // R_exam 70-90%
  criticalCards: number;   // R_exam < 70%
  averageRAtExam: number;
  estimatedScore: number;  // Percentage of cards you'll remember
  recommendation: string;
  dailyCardsNeeded: number;
}

/**
 * Get comprehensive exam preparedness summary
 * 
 * @param cards - All cards in deck
 * @param examDate - The exam date
 * @returns Preparedness summary with recommendations
 */
export function getExamPreparedness(
  cards: Flashcard[],
  examDate: Date
): ExamPreparedness {
  const config = getExamPhase(examDate);
  
  let totalR = 0;
  let ready = 0;
  let atRisk = 0;
  let critical = 0;
  
  cards.forEach(card => {
    const rExam = projectRetrievabilityAtDate(card, examDate);
    totalR += rExam;
    
    if (rExam >= 0.90) ready++;
    else if (rExam >= 0.70) atRisk++;
    else critical++;
  });
  
  const avgR = cards.length > 0 ? totalR / cards.length : 0;
  const estimatedScore = Math.round(avgR * 100);
  
  // Calculate daily cards needed to review all before exam
  const cardsNeedingWork = atRisk + critical;
  const dailyCardsNeeded = config.daysLeft > 0 
    ? Math.ceil(cardsNeedingWork / config.daysLeft)
    : cardsNeedingWork;
  
  let recommendation: string;
  if (avgR >= 0.90) {
    recommendation = "Excellent! You're well prepared. Light review recommended.";
  } else if (avgR >= 0.80) {
    recommendation = `Good progress. Focus on the ${atRisk + critical} cards at risk.`;
  } else if (avgR >= 0.70) {
    recommendation = `More study needed. Review ~${dailyCardsNeeded} cards/day to be ready.`;
  } else {
    recommendation = `Significant work required. Prioritize the ${critical} critical cards.`;
  }
  
  return {
    phase: config.phase,
    daysLeft: config.daysLeft,
    totalCards: cards.length,
    readyCards: ready,
    atRiskCards: atRisk,
    criticalCards: critical,
    averageRAtExam: avgR,
    estimatedScore,
    recommendation,
    dailyCardsNeeded
  };
}

// ============================================================================
// PROJECTED PERFORMANCE
// ============================================================================

export interface DailyProjection {
  date: Date;
  averageR: number;
  readyPercent: number;
  cardsReviewed: number;
  cardsRemaining: number;
}

/**
 * Project exam preparedness over time
 * 
 * @param cards - All cards in deck
 * @param examDate - The exam date
 * @param dailyReviewRate - Expected cards reviewed per day
 * @returns Array of daily projections
 */
export function projectPreparedness(
  cards: Flashcard[],
  examDate: Date,
  dailyReviewRate: number = 20
): DailyProjection[] {
  const config = getExamPhase(examDate);
  const projections: DailyProjection[] = [];
  
  if (config.daysLeft <= 0) return projections;
  
  // Sort cards by urgency (lowest R first)
  const sortedCards = [...cards].sort((a, b) => 
    getCardRetrievability(a) - getCardRetrievability(b)
  );
  
  let cardsReviewed = 0;
  
  for (let day = 0; day <= config.daysLeft; day++) {
    const projectionDate = new Date();
    projectionDate.setDate(projectionDate.getDate() + day);
    
    // Simulate reviewing cards
    const reviewedToday = Math.min(dailyReviewRate, sortedCards.length - cardsReviewed);
    cardsReviewed += reviewedToday;
    
    // Calculate average R at exam for cards reviewed so far
    // Assume reviewed cards get R boosted to ~0.95
    let totalR = 0;
    cards.forEach((card, idx) => {
      if (idx < cardsReviewed) {
        // Reviewed - assume high R
        totalR += 0.95;
      } else {
        // Not yet reviewed - project decay
        totalR += projectRetrievabilityAtDate(card, examDate);
      }
    });
    
    const avgR = cards.length > 0 ? totalR / cards.length : 0;
    const readyPercent = cards.length > 0 
      ? Math.round((cardsReviewed / cards.length) * 100)
      : 0;
    
    projections.push({
      date: projectionDate,
      averageR: avgR,
      readyPercent,
      cardsReviewed,
      cardsRemaining: cards.length - cardsReviewed
    });
  }
  
  return projections;
}

// ============================================================================
// CRAM MODE HELPERS
// ============================================================================

/**
 * Get cards sorted by R at exam (for cram mode)
 * Includes the calculated R_exam value
 * 
 * @param cards - All cards in deck
 * @param examDate - The exam date
 * @returns Cards with rAtExam field populated
 */
export function getCardsWithRAtExam(
  cards: Flashcard[],
  examDate: Date
): (Flashcard & { rAtExam: number })[] {
  return cards
    .map(card => ({
      ...card,
      rAtExam: projectRetrievabilityAtDate(card, examDate)
    }))
    .sort((a, b) => a.rAtExam - b.rAtExam);
}

/**
 * Determine if card should be compressed (reviewed early)
 * 
 * In cram mode, we review cards early if their R at exam would be too low.
 * This is "interval compression" from the research.
 * 
 * @param card - Card to check
 * @param examDate - The exam date
 * @param threshold - R threshold below which to review early (default 0.85)
 * @returns true if card should be reviewed now
 */
export function shouldCompressInterval(
  card: Flashcard,
  examDate: Date,
  threshold: number = 0.85
): boolean {
  const rAtExam = projectRetrievabilityAtDate(card, examDate);
  return rAtExam < threshold;
}

// ============================================================================
// POST-EXAM HANDLING
// ============================================================================

/**
 * Get recommended action for post-exam deck
 * 
 * @param deck - Deck that's past its test date
 * @returns Recommended action
 */
export function getPostExamRecommendation(deck: Deck): {
  action: 'CONVERT' | 'ARCHIVE' | 'KEEP';
  message: string;
} {
  if (!deck.testDate) {
    return {
      action: 'KEEP',
      message: 'Deck has no test date'
    };
  }
  
  const config = getExamPhase(new Date(deck.testDate));
  
  if (config.phase !== 'POST_EXAM') {
    return {
      action: 'KEEP',
      message: 'Exam has not passed yet'
    };
  }
  
  const daysPast = Math.abs(config.daysLeft);
  
  if (daysPast <= 7) {
    return {
      action: 'CONVERT',
      message: 'Convert to Long-Term mode to continue learning'
    };
  } else {
    return {
      action: 'ARCHIVE',
      message: 'Archive this deck or delete if no longer needed'
    };
  }
}

// ============================================================================
// PHASE TRANSITION HOOKS
// ============================================================================

/**
 * Check if deck is transitioning to a new phase
 * 
 * @param deck - Current deck state
 * @param previousPhase - Previous phase (if known)
 * @returns true if phase has changed
 */
export function hasPhaseChanged(
  deck: Deck,
  previousPhase?: ExamPhase
): boolean {
  if (!deck.testDate) return false;
  
  const currentConfig = getExamPhase(new Date(deck.testDate));
  return previousPhase !== undefined && previousPhase !== currentConfig.phase;
}

/**
 * Get phase transition message
 * 
 * @param newPhase - The new phase
 * @returns User-friendly message about the transition
 */
export function getPhaseTransitionMessage(newPhase: ExamPhase): string {
  switch (newPhase) {
    case 'MAINTENANCE':
      return "You're in maintenance mode. Light studying to keep memories fresh.";
    case 'CONSOLIDATION':
      return "Consolidation phase! Time to strengthen weak memories.";
    case 'CRAM':
      return "Cram time! Focus on cards you're most likely to forget on exam day.";
    case 'EXAM_DAY':
      return "It's exam day! Only reviewing struggling cards. You've got this!";
    case 'POST_EXAM':
      return "Exam complete! Consider converting to Long-Term mode or archiving.";
    default:
      return "";
  }
}

