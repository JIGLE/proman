import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "Maintenance",
  "Repairs",
  "Utilities",
  "Insurance",
  "Taxes",
  "Mortgage",
  "Management Fees",
  "Cleaning",
  "Legal",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const expenseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date"),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(200, "Description too long").optional(),
});

export const createExpenseSchema = expenseSchema;
export const updateExpenseSchema = expenseSchema.partial();

export type Expense = z.infer<typeof expenseSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
