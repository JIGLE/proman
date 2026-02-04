/**
 * Real Insights Service
 * Prisma-backed insights for production use
 */

import { getPrismaClient } from './database/database';
import type { InsightTotals, TimeSeriesPoint, InsightsOverview } from './insights.types';

/**
 * Get insights overview from real database
 */
export async function getInsightsOverview(): Promise<InsightsOverview> {
  const prisma = getPrismaClient();
  
  // Get current period data
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

  // Get property metrics
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      status: true,
    },
  });

  const totalProperties = properties.length;
  const totalUnits = totalProperties; // Simplified: 1 unit per property
  const occupiedUnits = properties.filter(p => p.status === 'occupied').length;
  const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : 0;

  // Get revenue metrics
  const monthlyReceipts = await prisma.receipt.findMany({
    where: {
      status: 'paid',
      date: { gte: startOfMonth },
    },
    select: { amount: true },
  });

  const yearlyReceipts = await prisma.receipt.findMany({
    where: {
      status: 'paid',
      date: { gte: startOfYear },
    },
    select: { amount: true },
  });

  const lastYearReceipts = await prisma.receipt.findMany({
    where: {
      status: 'paid',
      date: { gte: lastYearStart, lte: lastYearEnd },
    },
    select: { amount: true },
  });

  const monthlyRevenue = monthlyReceipts.reduce((sum, r) => sum + r.amount, 0);
  const yearlyRevenue = yearlyReceipts.reduce((sum, r) => sum + r.amount, 0);
  const lastYearRevenue = lastYearReceipts.reduce((sum, r) => sum + r.amount, 0);

  // Calculate expenses (simplified: 30% of revenue)
  const monthlyExpenses = monthlyRevenue * 0.3;
  const profitMargin = monthlyRevenue > 0 ? (monthlyRevenue - monthlyExpenses) / monthlyRevenue : 0;
  const yoyGrowth = lastYearRevenue > 0 ? ((yearlyRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;

  const totals: InsightTotals = {
    properties: totalProperties,
    units: totalUnits,
    occupancyRate,
    monthlyRevenue,
    monthlyExpenses,
    profitMargin,
    yoyGrowth,
  };

  // Get revenue trend (last 6 months)
  const revenueTrend: TimeSeriesPoint[] = [];
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    const receipts = await prisma.receipt.findMany({
      where: {
        status: 'paid',
        date: {
          gte: targetDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    });
    
    revenueTrend.push({
      label: MONTH_LABELS[targetDate.getMonth()] || "",
      value: receipts.reduce((sum, r) => sum + r.amount, 0),
    });
  }

  // Get occupancy trend (last 6 months)
  // Note: This is simplified - in reality you'd want historical snapshots
  const occupancyTrend: TimeSeriesPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Simplified: use current occupancy for all months
    occupancyTrend.push({
      label: MONTH_LABELS[targetDate.getMonth()] || "",
      value: occupancyRate,
    });
  }

  return {
    totals,
    revenueTrend,
    occupancyTrend,
  };
}
