import { PriorityLevel } from '../config/constants';
import { priorityConfig } from '../config/priorityConfig';

export interface PriorityCalculationResult {
  score: number;
  level: PriorityLevel;
  breakdown: {
    baseWeight: number;
    confidenceContribution: number;
    nearbyContribution: number;
    recencyBonus: number;
  };
}

/**
 * Deterministic Civic Priority Calculation Engine (PRD Section 24)
 * Formula:
 *   Priority Score = Base Issue Weight + Confidence Contribution + Nearby Report Contribution + Recency Bonus
 * Normalized: 0 - 100
 * Mapping:
 *   0 - 39: LOW
 *   40 - 69: MEDIUM
 *   70 - 100: HIGH
 */
export const calculatePriority = (params: {
  categoryKey: string;
  customBaseWeight?: number;
  confidence: number; // 0.0 to 1.0
  nearbyReportCount: number;
  hasRecentReportsWithin7Days?: boolean;
}): PriorityCalculationResult => {
  const {
    categoryKey,
    customBaseWeight,
    confidence,
    nearbyReportCount,
    hasRecentReportsWithin7Days = false
  } = params;

  // 1. Base Issue Weight (Default or custom configured from DB category)
  const baseWeight =
    customBaseWeight !== undefined
      ? customBaseWeight
      : priorityConfig.baseCategoryWeights[categoryKey.toLowerCase()] || 20;

  // 2. Confidence Contribution (0.0 to 1.0 -> scaled up to 20 pts)
  const confidenceScore = Math.min(Math.max(confidence, 0), 1);
  const confidenceContribution = Math.round(confidenceScore * priorityConfig.confidenceMultiplier);

  // 3. Nearby Report Contribution (e.g., 8 pts per nearby report, max 40 pts)
  const nearbyContribution = Math.min(
    nearbyReportCount * priorityConfig.nearbyReportMultiplier,
    priorityConfig.maxNearbyReportContribution
  );

  // 4. Recency Bonus (if recurring complaints occurred within the last 7 days)
  const recencyBonus = hasRecentReportsWithin7Days && nearbyReportCount > 0 ? 5 : 0;

  // Total raw score clamped between 0 and 100
  const rawScore = baseWeight + confidenceContribution + nearbyContribution + recencyBonus;
  const score = Math.min(Math.max(rawScore, 0), 100);

  // Determine Priority Level
  let level: PriorityLevel;
  if (score >= 85) {
    level = PriorityLevel.CRITICAL;
  } else if (score >= priorityConfig.thresholdHigh) {
    level = PriorityLevel.HIGH;
  } else if (score >= priorityConfig.thresholdLow) {
    level = PriorityLevel.MEDIUM;
  } else {
    level = PriorityLevel.LOW;
  }

  return {
    score,
    level,
    breakdown: {
      baseWeight,
      confidenceContribution,
      nearbyContribution,
      recencyBonus
    }
  };
};
