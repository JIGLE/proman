/**
 * Analytics Service - KPI calculations and dashboard metrics
 * Phase 5: Dashboard & Analytics
 */

import { getPrismaClient } from './database/database';

// Helper to check if Prisma is available
function isPrismaAvailable(): boolean {
  try {
    // During build time or when DATABASE_URL is not set, getPrismaClient returns a proxy
    const client = getPrismaClient();
    // If it's a proxy, accessing any model will throw
    return client && typeof client.property?.findMany === 'function';
  } catch {
    return false;
  }
}

// Get prisma client safely
function getPrisma() {
  try {
    return getPrismaClient();
  } catch {
    return null;
  }
}

// Type definitions for analytics
export interface KPIMetrics {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  totalTenants: number;
  activeTenants: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalExpenses: number;
  netIncome: number;
  overduePayments: number;
  overdueAmount: number;
  averageRent: number;
  collectionRate: number;
}

export interface RevenueByMonth {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  address: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expenses: number;
  netIncome: number;
  roi: number;
}

export interface LeaseExpiration {
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  endDate: string;
  daysUntilExpiration: number;
  monthlyRent: number;
  status: 'expired' | 'critical' | 'warning' | 'healthy';
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  averageResolutionDays: number;
}

export interface OccupancyTrend {
  month: string;
  year: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
}

export interface DashboardAnalytics {
  kpis: KPIMetrics;
  revenueByMonth: RevenueByMonth[];
  propertyPerformance: PropertyPerformance[];
  leaseExpirations: LeaseExpiration[];
  maintenanceStats: MaintenanceStats;
  occupancyTrend: OccupancyTrend[];
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: 'payment' | 'lease' | 'maintenance' | 'tenant' | 'property';
  message: string;
  timestamp: string;
  amount?: number;
  icon: string;
}

class AnalyticsService {
  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
    const [
      kpis,
      revenueByMonth,
      propertyPerformance,
      leaseExpirations,
      maintenanceStats,
      occupancyTrend,
      recentActivities
    ] = await Promise.all([
      this.getKPIMetrics(userId),
      this.getRevenueByMonth(userId, 12),
      this.getPropertyPerformance(userId),
      this.getLeaseExpirations(userId),
      this.getMaintenanceStats(userId),
      this.getOccupancyTrend(userId, 12),
      this.getRecentActivities(userId, 10)
    ]);

    return {
      kpis,
      revenueByMonth,
      propertyPerformance,
      leaseExpirations,
      maintenanceStats,
      occupancyTrend,
      recentActivities
    };
  }

  /**
   * Calculate KPI metrics
   */
  async getKPIMetrics(userId: string): Promise<KPIMetrics> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return this.getEmptyKPIMetrics();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    try {
      // Get property and unit counts
      const properties = await prisma.property.findMany({
        where: { userId },
        include: { units: true }
      });

      const totalProperties = properties.length;
      const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0);
      const occupiedUnits = properties.reduce(
        (sum, p) => sum + (p.units?.filter(u => u.status === 'occupied').length || 0),
        0
      );
      const vacantUnits = totalUnits - occupiedUnits;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      // Get tenant counts
      const tenants = await prisma.tenant.findMany({
        where: { userId }
      });
      const totalTenants = tenants.length;
      // Active tenants are those whose lease hasn't ended yet
      const activeTenants = tenants.filter(t => new Date(t.leaseEnd) >= now).length;

      // Get receipt/invoice data for revenue
      const receipts = await prisma.receipt.findMany({
        where: {
          userId,
          status: 'paid',
          date: { gte: startOfMonth }
        }
      });

      const yearlyReceipts = await prisma.receipt.findMany({
        where: {
          userId,
          status: 'paid',
          date: { gte: startOfYear }
        }
      });

      const monthlyRevenue = receipts.reduce((sum, r) => sum + r.amount, 0);
      const yearlyRevenue = yearlyReceipts.reduce((sum, r) => sum + r.amount, 0);

      // Get expenses
      const expenses = await prisma.expense.findMany({
        where: {
          userId,
          date: { gte: startOfYear }
        }
      });
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netIncome = yearlyRevenue - totalExpenses;

      // Get overdue payments (receipts with pending status and date more than 30 days ago)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueReceipts = await prisma.receipt.findMany({
        where: {
          userId,
          status: 'pending',
          date: { lt: thirtyDaysAgo }
        }
      });
      const overduePayments = overdueReceipts.length;
      const overdueAmount = overdueReceipts.reduce((sum, r) => sum + r.amount, 0);

      // Calculate average rent
      const activeLeases = await prisma.lease.findMany({
        where: {
          userId,
          endDate: { gte: now }
        }
      });
      const averageRent = activeLeases.length > 0
        ? activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0) / activeLeases.length
        : 0;

      // Calculate collection rate
      const allMonthlyReceipts = await prisma.receipt.findMany({
        where: {
          userId,
          date: { gte: startOfMonth }
        }
      });
      const paidReceipts = allMonthlyReceipts.filter(r => r.status === 'paid');
      const collectionRate = allMonthlyReceipts.length > 0
        ? (paidReceipts.length / allMonthlyReceipts.length) * 100
        : 100;

      return {
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        totalTenants,
        activeTenants,
        monthlyRevenue,
        yearlyRevenue,
        totalExpenses,
        netIncome,
        overduePayments,
        overdueAmount,
        averageRent,
        collectionRate
      };
    } catch (error) {
      console.error('Error calculating KPI metrics:', error);
      return this.getEmptyKPIMetrics();
    }
  }

  /**
   * Get revenue by month for the specified number of months
   */
  async getRevenueByMonth(userId: string, months: number = 12): Promise<RevenueByMonth[]> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return this.getMockRevenueByMonth(months);
    }

    const result: RevenueByMonth[] = [];
    const now = new Date();

    try {
      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

        const receipts = await prisma.receipt.findMany({
          where: {
            userId,
            status: 'paid',
            date: {
              gte: targetDate,
              lte: endDate
            }
          }
        });

        const expenses = await prisma.expense.findMany({
          where: {
            userId,
            date: {
              gte: targetDate,
              lte: endDate
            }
          }
        });

        const revenue = receipts.reduce((sum, r) => sum + r.amount, 0);
        const expense = expenses.reduce((sum, e) => sum + e.amount, 0);

        result.push({
          month: targetDate.toLocaleString('default', { month: 'short' }),
          year: targetDate.getFullYear(),
          revenue,
          expenses: expense,
          netIncome: revenue - expense
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching revenue by month:', error);
      return this.getMockRevenueByMonth(months);
    }
  }

  /**
   * Get property performance metrics
   */
  async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return [];
    }

    try {
      const properties = await prisma.property.findMany({
        where: { userId },
        include: {
          units: true,
          receipts: {
            where: {
              status: 'paid',
              date: {
                gte: new Date(new Date().getFullYear(), 0, 1)
              }
            }
          },
          expenses: {
            where: {
              date: {
                gte: new Date(new Date().getFullYear(), 0, 1)
              }
            }
          }
        }
      });

      return properties.map(property => {
        const totalUnits = property.units?.length || 0;
        const occupiedUnits = property.units?.filter(u => u.status === 'occupied').length || 0;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
        
        const yearlyRevenue = property.receipts?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const monthlyRevenue = yearlyRevenue / 12;
        const expenses = property.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const netIncome = yearlyRevenue - expenses;
        
        // ROI calculation (simplified - assumes property value from purchase price or estimated value)
        const propertyValue = (property as { purchasePrice?: number }).purchasePrice || yearlyRevenue * 10;
        const roi = propertyValue > 0 ? (netIncome / propertyValue) * 100 : 0;

        return {
          propertyId: property.id,
          propertyName: property.name,
          address: property.address,
          totalUnits,
          occupiedUnits,
          occupancyRate,
          monthlyRevenue,
          yearlyRevenue,
          expenses,
          netIncome,
          roi
        };
      });
    } catch (error) {
      console.error('Error fetching property performance:', error);
      return [];
    }
  }

  /**
   * Get upcoming lease expirations
   */
  async getLeaseExpirations(userId: string, daysAhead: number = 90): Promise<LeaseExpiration[]> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return [];
    }

    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const leases = await prisma.lease.findMany({
        where: {
          userId,
          status: 'active',
          endDate: {
            lte: futureDate
          }
        },
        include: {
          tenant: true,
          property: true,
          unit: true
        },
        orderBy: {
          endDate: 'asc'
        }
      });

      return leases.map(lease => {
        const endDate = new Date(lease.endDate);
        const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: LeaseExpiration['status'] = 'healthy';
        if (daysUntilExpiration < 0) status = 'expired';
        else if (daysUntilExpiration <= 30) status = 'critical';
        else if (daysUntilExpiration <= 60) status = 'warning';

        return {
          leaseId: lease.id,
          tenantName: lease.tenant?.name || 'Unknown',
          propertyName: lease.property?.name || 'Unknown',
          unitNumber: lease.unit?.number || 'N/A',
          endDate: lease.endDate.toISOString(),
          daysUntilExpiration,
          monthlyRent: lease.monthlyRent,
          status
        };
      });
    } catch (error) {
      console.error('Error fetching lease expirations:', error);
      return [];
    }
  }

  /**
   * Get maintenance statistics
   */
  async getMaintenanceStats(userId: string): Promise<MaintenanceStats> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        urgent: 0,
        averageResolutionDays: 0
      };
    }

    try {
      const requests = await prisma.maintenanceTicket.findMany({
        where: { userId }
      });

      const total = requests.length;
      const pending = requests.filter(r => r.status === 'open').length;
      const inProgress = requests.filter(r => r.status === 'in_progress').length;
      const completed = requests.filter(r => r.status === 'resolved' || r.status === 'closed').length;
      const urgent = requests.filter(r => r.priority === 'high').length;

      // Calculate average resolution time for completed requests
      const completedRequests = requests.filter(r => (r.status === 'resolved' || r.status === 'closed') && r.resolvedAt);
      let averageResolutionDays = 0;
      
      if (completedRequests.length > 0) {
        const totalDays = completedRequests.reduce((sum, r) => {
          const created = new Date(r.createdAt);
          const resolved = new Date(r.resolvedAt!);
          return sum + Math.ceil((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        averageResolutionDays = totalDays / completedRequests.length;
      }

      return {
        total,
        pending,
        inProgress,
        completed,
        urgent,
        averageResolutionDays
      };
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        urgent: 0,
        averageResolutionDays: 0
      };
    }
  }

  /**
   * Get occupancy trend over time
   */
  async getOccupancyTrend(userId: string, months: number = 12): Promise<OccupancyTrend[]> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return this.getMockOccupancyTrend(months);
    }

    // For now, return current occupancy for each month
    // In production, you'd track historical occupancy data
    try {
      const properties = await prisma.property.findMany({
        where: { userId },
        include: { units: true }
      });

      const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0);
      const occupiedUnits = properties.reduce(
        (sum, p) => sum + (p.units?.filter(u => u.status === 'occupied').length || 0),
        0
      );
      const currentOccupancy = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      const result: OccupancyTrend[] = [];
      const now = new Date();

      // Generate trend with slight variations (mock historical data)
      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const variation = Math.random() * 10 - 5; // ±5% variation for demo
        
        result.push({
          month: targetDate.toLocaleString('default', { month: 'short' }),
          year: targetDate.getFullYear(),
          occupancyRate: Math.min(100, Math.max(0, currentOccupancy + variation)),
          totalUnits,
          occupiedUnits: Math.round(totalUnits * (currentOccupancy + variation) / 100)
        });
      }

      // Set current month to actual values
      if (result.length > 0) {
        result[result.length - 1] = {
          ...result[result.length - 1],
          occupancyRate: currentOccupancy,
          occupiedUnits
        };
      }

      return result;
    } catch (error) {
      console.error('Error fetching occupancy trend:', error);
      return this.getMockOccupancyTrend(months);
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(userId: string, limit: number = 10): Promise<Activity[]> {
    const prisma = getPrisma();
    if (!isPrismaAvailable() || !prisma) {
      return [];
    }

    try {
      const activities: Activity[] = [];
      const now = new Date();

      // Get recent receipts
      const recentReceipts = await prisma.receipt.findMany({
        where: { userId, status: 'paid' },
        orderBy: { date: 'desc' },
        take: 5,
        include: { property: true, tenant: true }
      });

      recentReceipts.forEach(receipt => {
        activities.push({
          id: receipt.id,
          type: 'payment',
          message: `Payment received from ${receipt.tenant?.name || receipt.property?.name || 'Unknown'}`,
          timestamp: receipt.date.toISOString(),
          amount: receipt.amount,
          icon: '💰'
        });
      });

      // Get recent leases
      const recentLeases = await prisma.lease.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { tenant: true, property: true }
      });

      recentLeases.forEach(lease => {
        activities.push({
          id: lease.id,
          type: 'lease',
          message: `Lease ${new Date(lease.endDate) >= now ? 'signed' : 'updated'} - ${lease.tenant?.name || 'Unknown'}`,
          timestamp: lease.createdAt.toISOString(),
          amount: lease.monthlyRent,
          icon: '📝'
        });
      });

      // Get recent maintenance requests
      const recentMaintenance = await prisma.maintenanceTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { property: true }
      });

      recentMaintenance.forEach(request => {
        activities.push({
          id: request.id,
          type: 'maintenance',
          message: `Maintenance request: ${request.title}`,
          timestamp: request.createdAt.toISOString(),
          icon: request.priority === 'high' ? '🔧' : '🛠️'
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  // Helper methods for empty/mock data
  private getEmptyKPIMetrics(): KPIMetrics {
    return {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      occupancyRate: 0,
      totalTenants: 0,
      activeTenants: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      overduePayments: 0,
      overdueAmount: 0,
      averageRent: 0,
      collectionRate: 100
    };
  }

  private getMockRevenueByMonth(months: number): RevenueByMonth[] {
    const result: RevenueByMonth[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: targetDate.toLocaleString('default', { month: 'short' }),
        year: targetDate.getFullYear(),
        revenue: 0,
        expenses: 0,
        netIncome: 0
      });
    }
    
    return result;
  }

  private getMockOccupancyTrend(months: number): OccupancyTrend[] {
    const result: OccupancyTrend[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        month: targetDate.toLocaleString('default', { month: 'short' }),
        year: targetDate.getFullYear(),
        occupancyRate: 0,
        totalUnits: 0,
        occupiedUnits: 0
      });
    }
    
    return result;
  }
}

export const analyticsService = new AnalyticsService();
