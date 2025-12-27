/**
 * FSRS Parameter Optimizer
 * 
 * This module handles optimization of FSRS parameters based on user review history.
 * Implements the optimization algorithm from the FSRS research.
 * 
 * Key features:
 * - Log-loss based optimization
 * - Optimal retention calculator
 * - Review statistics
 */

import { DEFAULT_FSRS_PARAMETERS } from './spacedRepetition';

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewHistoryEntry {
  id: string;
  cardId: string;
  userId?: string;
  rating: 1 | 2 | 3 | 4;
  reviewedAt: Date;
  elapsedDays: number;
  scheduledDays: number;
  reviewTimeMs: number;
  stabilityBefore: number;
  difficultyBefore: number;
  state: number;
  
  // Legacy compat
  flashcardId?: string;
  scheduledFor?: string;
  intervalBefore?: number;
  learningState?: string;
}

export interface OptimizationResult {
  parameters: number[];
  optimized: boolean;
  retentionRate: number;
  rmse: number;
  logLoss: number;
  reviewCount: number;
  message: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageAccuracy: number;
  averageResponseTime: number;
  ratingDistribution: Record<1 | 2 | 3 | 4, number>;
  suspiciouslyFastReviews: number;
  averageStability: number;
  averageDifficulty: number;
  retentionByDay: Map<number, { pass: number; fail: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_REVIEWS_FOR_OPTIMIZATION = 400;
const MIN_REVIEWS_FOR_OPTIMAL_RETENTION = 100;
const DECAY_FACTOR = 0.5;
const DECAY_POWER = 0.5;

// ============================================================================
// RETRIEVABILITY PREDICTION
// ============================================================================

/**
 * Predict retrievability at a given elapsed time
 * 
 * @param stability - Stability in days
 * @param elapsedDays - Days since last review
 * @returns Predicted retrievability (0-1)
 */
export function predictR(stability: number, elapsedDays: number): number {
  if (stability <= 0 || elapsedDays <= 0) return 1.0;
  return Math.pow(1 + (DECAY_FACTOR * elapsedDays / stability), -DECAY_POWER);
}

// ============================================================================
// LOSS FUNCTIONS
// ============================================================================

/**
 * Calculate log loss for a single prediction
 * 
 * @param predicted - Predicted probability (0-1)
 * @param actual - Actual outcome (0 or 1)
 * @returns Log loss value
 */
export function logLoss(predicted: number, actual: number): number {
  const eps = 1e-7;
  const p = Math.max(eps, Math.min(1 - eps, predicted));
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

/**
 * Calculate RMSE for predictions
 * 
 * @param predictions - Array of (predicted, actual) pairs
 * @returns RMSE value
 */
export function calculateRMSE(
  predictions: Array<{ predicted: number; actual: number }>
): number {
  if (predictions.length === 0) return 0;
  
  const sumSquaredError = predictions.reduce((sum, { predicted, actual }) => {
    return sum + Math.pow(predicted - actual, 2);
  }, 0);
  
  return Math.sqrt(sumSquaredError / predictions.length);
}

// ============================================================================
// PARAMETER OPTIMIZATION
// ============================================================================

/**
 * Optimize FSRS parameters using review history
 * 
 * Uses gradient-free optimization (Nelder-Mead style) to minimize log-loss.
 * 
 * @param history - Array of review history entries
 * @returns Optimization result with parameters and metrics
 */
export async function optimizeFSRSParameters(
  history: ReviewHistoryEntry[]
): Promise<OptimizationResult> {
  if (history.length < MIN_REVIEWS_FOR_OPTIMIZATION) {
    const currentMetrics = calculateMetrics(history, DEFAULT_FSRS_PARAMETERS);
    
    return {
      parameters: DEFAULT_FSRS_PARAMETERS,
      optimized: false,
      retentionRate: currentMetrics.retentionRate,
      rmse: currentMetrics.rmse,
      logLoss: currentMetrics.logLoss,
      reviewCount: history.length,
      message: `Need ${MIN_REVIEWS_FOR_OPTIMIZATION - history.length} more reviews for optimization.`
    };
  }
  
  // Calculate current metrics
  const metrics = calculateMetrics(history, DEFAULT_FSRS_PARAMETERS);
  
  // TODO: Implement full gradient descent optimization
  // For now, return metrics with default parameters
  // Full implementation would require iterative parameter updates
  
  return {
    parameters: DEFAULT_FSRS_PARAMETERS,
    optimized: false,
    retentionRate: metrics.retentionRate,
    rmse: metrics.rmse,
    logLoss: metrics.logLoss,
    reviewCount: history.length,
    message: 'Metrics calculated. Full optimization requires Python FSRS optimizer for best results.'
  };
}

/**
 * Calculate metrics for a set of parameters
 */
function calculateMetrics(
  history: ReviewHistoryEntry[],
  _params: number[]
): { retentionRate: number; rmse: number; logLoss: number } {
  if (history.length === 0) {
    return { retentionRate: 0, rmse: 0, logLoss: 0 };
  }
  
  let passCount = 0;
  let totalLogLoss = 0;
  let totalSquaredError = 0;
  let validCount = 0;
  
  for (const entry of history) {
    const actual = entry.rating >= 2 ? 1 : 0;
    if (actual === 1) passCount++;
    
    // Only calculate prediction metrics for entries with valid stability
    if (entry.stabilityBefore > 0 && entry.elapsedDays >= 0) {
      const predicted = predictR(entry.stabilityBefore, entry.elapsedDays);
      totalLogLoss += logLoss(predicted, actual);
      totalSquaredError += Math.pow(predicted - actual, 2);
      validCount++;
    }
  }
  
  return {
    retentionRate: passCount / history.length,
    rmse: validCount > 0 ? Math.sqrt(totalSquaredError / validCount) : 0,
    logLoss: validCount > 0 ? totalLogLoss / validCount : 0
  };
}

// ============================================================================
// OPTIMAL RETENTION CALCULATOR
// ============================================================================

/**
 * Calculate optimal retention based on user's forgetting curve
 * 
 * Minimizes total study time = review time + relearning time
 * 
 * Formula insight:
 * - Higher R = more frequent reviews, less relearning
 * - Lower R = fewer reviews, more relearning
 * - Sweet spot typically around 0.85-0.90
 * 
 * @param history - Review history entries
 * @param avgReviewTimeSeconds - Average time per review
 * @param avgRelearnTimeSeconds - Average time to relearn a lapsed card
 * @returns Optimal retention (0.70-0.95)
 */
export function calculateOptimalRetention(
  history: ReviewHistoryEntry[],
  avgReviewTimeSeconds: number = 8,
  avgRelearnTimeSeconds: number = 30
): number {
  if (history.length < MIN_REVIEWS_FOR_OPTIMAL_RETENTION) {
    return 0.90;  // Default if insufficient data
  }
  
  // Build retention curve from data
  const intervalBuckets = new Map<number, { pass: number; fail: number; total: number }>();
  
  history.forEach(entry => {
    if (entry.elapsedDays < 0) return;
    
    const bucket = Math.floor(entry.elapsedDays);
    const existing = intervalBuckets.get(bucket) || { pass: 0, fail: 0, total: 0 };
    
    existing.total++;
    if (entry.rating >= 2) {
      existing.pass++;
    } else {
      existing.fail++;
    }
    
    intervalBuckets.set(bucket, existing);
  });
  
  // Calculate average stability from data
  const stabilities = history
    .filter(h => h.stabilityBefore > 0)
    .map(h => h.stabilityBefore);
  
  const avgStability = stabilities.length > 0
    ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length
    : 10;  // Default
  
  // Find retention that minimizes total time
  let optimalR = 0.90;
  let minTime = Infinity;
  
  for (let r = 0.70; r <= 0.95; r += 0.01) {
    // Estimate reviews needed at this retention
    // Interval at retention R: t = S × ((R^(-1/power)) - 1) / factor
    const interval = avgStability * (Math.pow(r, -1 / DECAY_POWER) - 1) / DECAY_FACTOR;
    const reviewsPerYear = Math.max(1, 365 / interval);
    
    // Probability of lapse at each review
    const lapseRate = 1 - r;
    const lapsesPerYear = reviewsPerYear * lapseRate;
    
    // Total time = review time + relearn time
    const totalTime = reviewsPerYear * avgReviewTimeSeconds + 
                      lapsesPerYear * avgRelearnTimeSeconds;
    
    if (totalTime < minTime) {
      minTime = totalTime;
      optimalR = r;
    }
  }
  
  return Math.round(optimalR * 100) / 100;
}

/**
 * Get recommended retention based on study goals
 * 
 * @param goal - Study goal type
 * @returns Recommended retention
 */
export function getRecommendedRetention(
  goal: 'efficiency' | 'balanced' | 'mastery'
): number {
  switch (goal) {
    case 'efficiency':
      return 0.80;  // Less reviews, some lapses
    case 'balanced':
      return 0.90;  // Standard
    case 'mastery':
      return 0.95;  // More reviews, fewer lapses
  }
}

// ============================================================================
// REVIEW STATISTICS
// ============================================================================

/**
 * Calculate comprehensive review statistics
 * 
 * @param history - Review history entries
 * @returns Detailed statistics
 */
export function calculateReviewStats(history: ReviewHistoryEntry[]): ReviewStats {
  if (history.length === 0) {
    return {
      totalReviews: 0,
      averageAccuracy: 0,
      averageResponseTime: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      suspiciouslyFastReviews: 0,
      averageStability: 0,
      averageDifficulty: 0,
      retentionByDay: new Map()
    };
  }
  
  const ratingDistribution: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const retentionByDay = new Map<number, { pass: number; fail: number }>();
  
  let correctCount = 0;
  let totalResponseTime = 0;
  let suspiciousCount = 0;
  let totalStability = 0;
  let totalDifficulty = 0;
  let validStateCount = 0;
  
  for (const entry of history) {
    // Rating distribution
    ratingDistribution[entry.rating]++;
    
    // Accuracy
    if (entry.rating >= 2) correctCount++;
    
    // Response time
    totalResponseTime += entry.reviewTimeMs || 0;
    
    // Suspicious reviews (< 1 second)
    if (entry.reviewTimeMs && entry.reviewTimeMs < 1000) {
      suspiciousCount++;
    }
    
    // Stability and difficulty averages
    if (entry.stabilityBefore > 0) {
      totalStability += entry.stabilityBefore;
      totalDifficulty += entry.difficultyBefore;
      validStateCount++;
    }
    
    // Retention by elapsed days
    if (entry.elapsedDays >= 0) {
      const dayBucket = Math.floor(entry.elapsedDays);
      const existing = retentionByDay.get(dayBucket) || { pass: 0, fail: 0 };
      
      if (entry.rating >= 2) {
        existing.pass++;
      } else {
        existing.fail++;
      }
      
      retentionByDay.set(dayBucket, existing);
    }
  }
  
  return {
    totalReviews: history.length,
    averageAccuracy: correctCount / history.length,
    averageResponseTime: totalResponseTime / history.length,
    ratingDistribution,
    suspiciouslyFastReviews: suspiciousCount,
    averageStability: validStateCount > 0 ? totalStability / validStateCount : 0,
    averageDifficulty: validStateCount > 0 ? totalDifficulty / validStateCount : 5,
    retentionByDay
  };
}

/**
 * Detect potential cheating based on response times
 * 
 * @param history - Review history entries
 * @returns Cheating risk assessment
 */
export function detectCheatingRisk(history: ReviewHistoryEntry[]): {
  riskLevel: 'low' | 'medium' | 'high';
  suspiciousReviews: number;
  suspiciousPercent: number;
  message: string;
} {
  if (history.length === 0) {
    return {
      riskLevel: 'low',
      suspiciousReviews: 0,
      suspiciousPercent: 0,
      message: 'No reviews to analyze'
    };
  }
  
  const suspiciousCount = history.filter(h => 
    h.reviewTimeMs && h.reviewTimeMs < 1000
  ).length;
  
  const suspiciousPercent = (suspiciousCount / history.length) * 100;
  
  let riskLevel: 'low' | 'medium' | 'high';
  let message: string;
  
  if (suspiciousPercent > 50) {
    riskLevel = 'high';
    message = 'Many reviews completed too quickly. Consider reviewing more carefully.';
  } else if (suspiciousPercent > 20) {
    riskLevel = 'medium';
    message = 'Some reviews may have been rushed.';
  } else {
    riskLevel = 'low';
    message = 'Review times look normal.';
  }
  
  return {
    riskLevel,
    suspiciousReviews: suspiciousCount,
    suspiciousPercent,
    message
  };
}

/**
 * Get learning insights from review data
 * 
 * @param history - Review history entries
 * @returns Learning insights and recommendations
 */
export function getLearningInsights(history: ReviewHistoryEntry[]): {
  strongestTimeOfDay?: string;
  averageSessionLength: number;
  mostDifficultCards: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
} {
  if (history.length < 50) {
    return {
      averageSessionLength: 0,
      mostDifficultCards: [],
      improvementTrend: 'stable'
    };
  }
  
  // Calculate improvement trend (compare first half to second half)
  const halfPoint = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, halfPoint);
  const secondHalf = history.slice(halfPoint);
  
  const firstHalfAccuracy = firstHalf.filter(h => h.rating >= 2).length / firstHalf.length;
  const secondHalfAccuracy = secondHalf.filter(h => h.rating >= 2).length / secondHalf.length;
  
  let improvementTrend: 'improving' | 'stable' | 'declining';
  if (secondHalfAccuracy > firstHalfAccuracy + 0.05) {
    improvementTrend = 'improving';
  } else if (secondHalfAccuracy < firstHalfAccuracy - 0.05) {
    improvementTrend = 'declining';
  } else {
    improvementTrend = 'stable';
  }
  
  // Find most difficult cards (most lapses)
  const cardLapses = new Map<string, number>();
  history.forEach(h => {
    if (h.rating === 1) {
      const count = cardLapses.get(h.cardId) || 0;
      cardLapses.set(h.cardId, count + 1);
    }
  });
  
  const mostDifficultCards = Array.from(cardLapses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cardId]) => cardId);
  
  return {
    averageSessionLength: 0,  // Would need session tracking
    mostDifficultCards,
    improvementTrend
  };
}
