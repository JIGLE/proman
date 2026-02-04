/**
 * Mock Insights Service
 * Read-only fixtures for local development without DATABASE_URL
 */

import type { InsightTotals, TimeSeriesPoint, InsightsOverview } from './insights.types';

// Fixed mock data - read-only
const MOCK_TOTALS: InsightTotals = Object.freeze({
  properties: 24,
  units: 186,
  occupancyRate: 0.93,
  monthlyRevenue: 248000,
  monthlyExpenses: 91000,
  profitMargin: 0.63,
  yoyGrowth: 12.4,
});

const MOCK_REVENUE_TREND: TimeSeriesPoint[] = Object.freeze([
  { label: "Jan", value: 210000 },
  { label: "Feb", value: 215000 },
  { label: "Mar", value: 225000 },
  { label: "Apr", value: 230000 },
  { label: "May", value: 242000 },
  { label: "Jun", value: 248000 },
]);

const MOCK_OCCUPANCY_TREND: TimeSeriesPoint[] = Object.freeze([
  { label: "Jan", value: 0.91 },
  { label: "Feb", value: 0.92 },
  { label: "Mar", value: 0.91 },
  { label: "Apr", value: 0.93 },
  { label: "May", value: 0.94 },
  { label: "Jun", value: 0.93 },
]);

/**
 * Get insights overview with mock data
 */
export async function getInsightsOverview(): Promise<InsightsOverview> {
  // Simulate async behavior
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    totals: { ...MOCK_TOTALS },
    revenueTrend: [...MOCK_REVENUE_TREND],
    occupancyTrend: [...MOCK_OCCUPANCY_TREND],
  };
}
