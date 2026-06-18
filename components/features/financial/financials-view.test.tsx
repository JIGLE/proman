import { describe, it, expect, vi } from "vitest";
import { renderWithProviders as render, screen } from "@/tests/helpers/render-with-providers";
import { FinancialsView } from "./financials-view";

// Mock the currency hook
vi.mock("@/lib/contexts/currency-context", () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number | undefined) =>
      amount !== undefined ? `$${amount.toFixed(2)}` : "$0.00",
  }),
}));

vi.mock("@/lib/contexts/app-context", () => ({
  useApp: () => ({
    state: {
      properties: [],
      receipts: [],
      expenses: [],
      loading: false,
      metrics: {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        filteredReceipts: [],
        filteredExpenses: [],
      },
    },
    addExpense: vi.fn(),
  }),
}));

vi.mock("@/lib/contexts/toast-context", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-form-dialog", () => ({
  useFormDialog: () => ({
    isOpen: false,
    isSubmitting: false,
    isValidating: false,
    formData: {},
    formErrors: {},
    editingItem: null,
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaved: null,
    hasPersistedData: false,
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    openEditDialog: vi.fn(),
    handleSubmit: vi.fn(),
    updateFormData: vi.fn(),
    setFormData: vi.fn(),
    resetForm: vi.fn(),
    validateField: vi.fn(),
    validateForm: vi.fn(),
    restoreForm: vi.fn(),
    clearPersistedData: vi.fn(),
    forceSave: vi.fn(),
  }),
}));

describe("FinancialsView", () => {
  it("renders empty state when no data", () => {
    render(<FinancialsView />);
    expect(screen.getByText(/Accounts/)).toBeDefined();
    expect(screen.getByText(/No financial data yet/)).toBeDefined();
  });
});
