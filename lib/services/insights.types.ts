/**
 * Shared type definitions for Insights service
 */

export interface InsightTotals {
  properties: number;
  units: number;
  occupancyRate: number; // 0-1
  monthlyRevenue: number;
  monthlyExpenses: number;
  profitMargin: number; // 0-1
  yoyGrowth: number; // percentage
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface InsightsOverview {
  totals: InsightTotals;
  revenueTrend: TimeSeriesPoint[];
  occupancyTrend: TimeSeriesPoint[];
}
