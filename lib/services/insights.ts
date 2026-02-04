/**
 * Insights Service Barrel
 * Selects mock or real implementation based on data mode
 */

import { dataMode } from '@/lib/config/data-mode';

// Re-export types
export type { InsightTotals, TimeSeriesPoint, InsightsOverview } from './insights.types';

// Select implementation based on data mode
export const getInsightsOverview = 
  dataMode === 'mock'
    ? (await import('./insights.mock')).getInsightsOverview
    : (await import('./insights.real')).getInsightsOverview;
