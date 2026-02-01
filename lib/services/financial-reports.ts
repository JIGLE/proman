import { getPrismaClient } from './database';
import { invoiceService, type Invoice } from './invoice-service';

export interface FinancialReport {
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  income: {
    totalRent: number;
    totalDeposits: number;
    totalOther: number;
    total: number;
    byProperty: PropertyIncome[];
  };
  expenses: {
    total: number;
    byCategory: CategoryExpense[];
    byProperty: PropertyExpense[];
  };
  invoices: {
    summary: {
      totalPending: number;
      totalPaid: number;
      totalOverdue: number;
      totalLateFees: number;
      invoiceCount: { pending: number; paid: number; overdue: number; cancelled: number };
    };
    list: Invoice[];
  };
  netIncome: number;
  profitMargin: number;
}

export interface PropertyIncome {
  propertyId: string;
  propertyName: string;
  rent: number;
  deposits: number;
  other: number;
  total: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

export interface PropertyExpense {
  propertyId: string;
  propertyName: string;
  amount: number;
  percentage: number;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeDetails: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Generate financial report for a given period
 */
export async function generateFinancialReport(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FinancialReport> {
  const prisma = getPrismaClient();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get receipts (income) for the period
  const receipts = await prisma.receipt.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      property: { select: { id: true, name: true } },
    },
  });
  
  // Get expenses for the period
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      property: { select: { id: true, name: true } },
    },
  });
  
  // Calculate income totals
  let totalRent = 0;
  let totalDeposits = 0;
  let totalOther = 0;
  const incomeByProperty: Map<string, PropertyIncome> = new Map();
  
  for (const receipt of receipts) {
    const propertyId = receipt.propertyId;
    const propertyName = receipt.property.name;
    
    if (!incomeByProperty.has(propertyId)) {
      incomeByProperty.set(propertyId, {
        propertyId,
        propertyName,
        rent: 0,
        deposits: 0,
        other: 0,
        total: 0,
      });
    }
    
    const propIncome = incomeByProperty.get(propertyId)!;
    
    switch (receipt.type) {
      case 'rent':
        totalRent += receipt.amount;
        propIncome.rent += receipt.amount;
        break;
      case 'deposit':
        totalDeposits += receipt.amount;
        propIncome.deposits += receipt.amount;
        break;
      default:
        totalOther += receipt.amount;
        propIncome.other += receipt.amount;
    }
    
    propIncome.total += receipt.amount;
  }
  
  const totalIncome = totalRent + totalDeposits + totalOther;
  
  // Calculate expense totals
  let totalExpenses = 0;
  const expensesByCategory: Map<string, number> = new Map();
  const expensesByProperty: Map<string, { name: string; amount: number }> = new Map();
  
  for (const expense of expenses) {
    totalExpenses += expense.amount;
    
    // By category
    const currentCategory = expensesByCategory.get(expense.category) || 0;
    expensesByCategory.set(expense.category, currentCategory + expense.amount);
    
    // By property
    const propertyId = expense.propertyId;
    const propertyName = expense.property.name;
    
    if (!expensesByProperty.has(propertyId)) {
      expensesByProperty.set(propertyId, { name: propertyName, amount: 0 });
    }
    expensesByProperty.get(propertyId)!.amount += expense.amount;
  }
  
  // Convert to arrays with percentages
  const categoryExpenses: CategoryExpense[] = Array.from(expensesByCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  
  const propertyExpenses: PropertyExpense[] = Array.from(expensesByProperty.entries())
    .map(([propertyId, data]) => ({
      propertyId,
      propertyName: data.name,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Get invoice summary
  const invoiceSummary = await invoiceService.getSummary(userId, startDate, endDate);
  const invoiceList = await invoiceService.getAll(userId);
  const filteredInvoices = invoiceList.filter(inv => {
    const invDate = new Date(inv.createdAt);
    return invDate >= start && invDate <= end;
  });
  
  // Calculate net income and profit margin
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? Math.round((netIncome / totalIncome) * 10000) / 100 : 0;
  
  // Generate period label
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const periodLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  
  return {
    period: {
      startDate,
      endDate,
      label: periodLabel,
    },
    income: {
      totalRent: Math.round(totalRent * 100) / 100,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
      totalOther: Math.round(totalOther * 100) / 100,
      total: Math.round(totalIncome * 100) / 100,
      byProperty: Array.from(incomeByProperty.values()).sort((a, b) => b.total - a.total),
    },
    expenses: {
      total: Math.round(totalExpenses * 100) / 100,
      byCategory: categoryExpenses,
      byProperty: propertyExpenses,
    },
    invoices: {
      summary: invoiceSummary,
      list: filteredInvoices,
    },
    netIncome: Math.round(netIncome * 100) / 100,
    profitMargin,
  };
}

/**
 * Export financial data to CSV format
 */
export function exportToCSV(report: FinancialReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push('FINANCIAL REPORT');
  lines.push(`Period: ${report.period.label}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  // Summary
  lines.push('=== SUMMARY ===');
  lines.push(`Total Income,${report.income.total}`);
  lines.push(`Total Expenses,${report.expenses.total}`);
  lines.push(`Net Income,${report.netIncome}`);
  lines.push(`Profit Margin,${report.profitMargin}%`);
  lines.push('');
  
  // Income breakdown
  lines.push('=== INCOME BREAKDOWN ===');
  lines.push('Type,Amount');
  lines.push(`Rent,${report.income.totalRent}`);
  lines.push(`Deposits,${report.income.totalDeposits}`);
  lines.push(`Other,${report.income.totalOther}`);
  lines.push('');
  
  // Income by property
  lines.push('=== INCOME BY PROPERTY ===');
  lines.push('Property,Rent,Deposits,Other,Total');
  for (const prop of report.income.byProperty) {
    lines.push(`"${prop.propertyName}",${prop.rent},${prop.deposits},${prop.other},${prop.total}`);
  }
  lines.push('');
  
  // Expenses by category
  lines.push('=== EXPENSES BY CATEGORY ===');
  lines.push('Category,Amount,Percentage');
  for (const cat of report.expenses.byCategory) {
    lines.push(`"${cat.category}",${cat.amount},${cat.percentage}%`);
  }
  lines.push('');
  
  // Expenses by property
  lines.push('=== EXPENSES BY PROPERTY ===');
  lines.push('Property,Amount,Percentage');
  for (const prop of report.expenses.byProperty) {
    lines.push(`"${prop.propertyName}",${prop.amount},${prop.percentage}%`);
  }
  lines.push('');
  
  // Invoice summary
  lines.push('=== INVOICE SUMMARY ===');
  lines.push(`Pending,${report.invoices.summary.totalPending}`);
  lines.push(`Paid,${report.invoices.summary.totalPaid}`);
  lines.push(`Overdue,${report.invoices.summary.totalOverdue}`);
  lines.push(`Late Fees Collected,${report.invoices.summary.totalLateFees}`);
  lines.push('');
  
  // Invoice list
  if (report.invoices.list.length > 0) {
    lines.push('=== INVOICE DETAILS ===');
    lines.push('Invoice Number,Tenant,Property,Amount,Due Date,Status,Paid Date');
    for (const inv of report.invoices.list) {
      lines.push(
        `"${inv.number}","${inv.tenantName || 'N/A'}","${inv.propertyName || 'N/A'}",${inv.amount},${inv.dueDate},${inv.status},${inv.paidDate || ''}`
      );
    }
  }
  
  return lines.join('\n');
}

/**
 * Export financial data to JSON format
 */
export function exportToJSON(report: FinancialReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate tax report for a specific year
 */
export async function generateTaxReport(
  userId: string,
  year: number
): Promise<{
  year: number;
  grossIncome: number;
  totalExpenses: number;
  netIncome: number;
  deductibleExpenses: CategoryExpense[];
  quarterlyBreakdown: {
    quarter: string;
    income: number;
    expenses: number;
    net: number;
  }[];
  properties: {
    propertyId: string;
    propertyName: string;
    income: number;
    expenses: number;
    net: number;
  }[];
}> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  const report = await generateFinancialReport(userId, startDate, endDate);
  
  // Calculate quarterly breakdown
  const quarters = [
    { label: 'Q1', start: `${year}-01-01`, end: `${year}-03-31` },
    { label: 'Q2', start: `${year}-04-01`, end: `${year}-06-30` },
    { label: 'Q3', start: `${year}-07-01`, end: `${year}-09-30` },
    { label: 'Q4', start: `${year}-10-01`, end: `${year}-12-31` },
  ];
  
  const quarterlyBreakdown = await Promise.all(
    quarters.map(async (q) => {
      const qReport = await generateFinancialReport(userId, q.start, q.end);
      return {
        quarter: q.label,
        income: qReport.income.total,
        expenses: qReport.expenses.total,
        net: qReport.netIncome,
      };
    })
  );
  
  // Property-level breakdown
  const propertyMap: Map<string, { name: string; income: number; expenses: number }> = new Map();
  
  for (const prop of report.income.byProperty) {
    propertyMap.set(prop.propertyId, {
      name: prop.propertyName,
      income: prop.total,
      expenses: 0,
    });
  }
  
  for (const prop of report.expenses.byProperty) {
    if (propertyMap.has(prop.propertyId)) {
      propertyMap.get(prop.propertyId)!.expenses = prop.amount;
    } else {
      propertyMap.set(prop.propertyId, {
        name: prop.propertyName,
        income: 0,
        expenses: prop.amount,
      });
    }
  }
  
  const properties = Array.from(propertyMap.entries()).map(([propertyId, data]) => ({
    propertyId,
    propertyName: data.name,
    income: data.income,
    expenses: data.expenses,
    net: data.income - data.expenses,
  }));
  
  return {
    year,
    grossIncome: report.income.total,
    totalExpenses: report.expenses.total,
    netIncome: report.netIncome,
    deductibleExpenses: report.expenses.byCategory,
    quarterlyBreakdown,
    properties,
  };
}

/**
 * Generate rent roll report (summary of all current rents)
 */
export async function generateRentRoll(userId: string): Promise<{
  totalMonthlyRent: number;
  totalAnnualRent: number;
  occupancyRate: number;
  properties: {
    propertyId: string;
    propertyName: string;
    status: string;
    monthlyRent: number;
    tenantName?: string;
    leaseEnd?: string;
  }[];
}> {
  const prisma = getPrismaClient();
  
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      tenants: {
        where: {
          leaseEnd: { gte: new Date() },
        },
        orderBy: { leaseEnd: 'desc' },
        take: 1,
      },
    },
  });
  
  let totalMonthlyRent = 0;
  let occupiedCount = 0;
  
  const propertyDetails = properties.map((prop) => {
    const currentTenant = prop.tenants[0];
    const isOccupied = prop.status === 'occupied' && currentTenant;
    
    if (isOccupied) {
      totalMonthlyRent += prop.rent;
      occupiedCount++;
    }
    
    return {
      propertyId: prop.id,
      propertyName: prop.name,
      status: prop.status,
      monthlyRent: prop.rent,
      tenantName: currentTenant?.name,
      leaseEnd: currentTenant?.leaseEnd.toISOString().split('T')[0],
    };
  });
  
  const occupancyRate = properties.length > 0 
    ? Math.round((occupiedCount / properties.length) * 10000) / 100 
    : 0;
  
  return {
    totalMonthlyRent: Math.round(totalMonthlyRent * 100) / 100,
    totalAnnualRent: Math.round(totalMonthlyRent * 12 * 100) / 100,
    occupancyRate,
    properties: propertyDetails,
  };
}
