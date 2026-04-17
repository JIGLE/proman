"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
  Owner,
  Expense,
  MaintenanceTicket,
  Lease,
} from "@/lib/types";
import { useToast } from "./toast-context";
import { useCsrf } from "./csrf-context";
import { apiFetch } from "@/lib/utils/api-client";
import { createEntityActions } from "./create-entity-actions";
import { isDemoModeClient } from "@/lib/demo/demo-mode";
import { getDemoData } from "@/lib/demo/demo-data";
import { usePortalAccess } from "./portal-access-context";
import { filterStateForRole, PortalAppState } from "@/lib/portal-access";

interface AppState extends PortalAppState {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  templates: CorrespondenceTemplate[];
  correspondence: Correspondence[];
  owners: Owner[];
  expenses: Expense[];
  maintenance: MaintenanceTicket[];
  leases: Lease[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PROPERTIES"; payload: Property[] }
  | { type: "SET_TENANTS"; payload: Tenant[] }
  | { type: "SET_RECEIPTS"; payload: Receipt[] }
  | { type: "SET_TEMPLATES"; payload: CorrespondenceTemplate[] }
  | { type: "SET_CORRESPONDENCE"; payload: Correspondence[] }
  | { type: "SET_OWNERS"; payload: Owner[] }
  | { type: "SET_EXPENSES"; payload: Expense[] }
  | { type: "SET_MAINTENANCE"; payload: MaintenanceTicket[] }
  | { type: "SET_LEASES"; payload: Lease[] };

const initialState: AppState = {
  properties: [],
  tenants: [],
  receipts: [],
  templates: [],
  correspondence: [],
  owners: [],
  expenses: [],
  maintenance: [],
  leases: [],
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_PROPERTIES":
      return { ...state, properties: action.payload };
    case "SET_TENANTS":
      return { ...state, tenants: action.payload };
    case "SET_RECEIPTS":
      return { ...state, receipts: action.payload };
    case "SET_TEMPLATES":
      return { ...state, templates: action.payload };
    case "SET_CORRESPONDENCE":
      return { ...state, correspondence: action.payload };
    case "SET_OWNERS":
      return { ...state, owners: action.payload };
    case "SET_EXPENSES":
      return { ...state, expenses: action.payload };
    case "SET_MAINTENANCE":
      return { ...state, maintenance: action.payload };
    case "SET_LEASES":
      return { ...state, leases: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context type — public API (backward-compatible with all consumers)
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addProperty: (data: Partial<Property>) => Promise<void>;
  updateProperty: (id: string, data: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addTenant: (data: Partial<Tenant>) => Promise<void>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  addReceipt: (data: Partial<Receipt>) => Promise<void>;
  updateReceipt: (id: string, data: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  addTemplate: (data: Partial<CorrespondenceTemplate>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<CorrespondenceTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addCorrespondence: (data: Partial<Correspondence>) => Promise<void>;
  updateCorrespondence: (id: string, data: Partial<Correspondence>) => Promise<void>;
  deleteCorrespondence: (id: string) => Promise<void>;
  addOwner: (data: Partial<Owner>) => Promise<void>;
  updateOwner: (id: string, data: Partial<Owner>) => Promise<void>;
  deleteOwner: (id: string) => Promise<void>;
  addExpense: (data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addMaintenance: (data: Partial<MaintenanceTicket>) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<MaintenanceTicket>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  addLease: (data: Partial<Lease>) => Promise<void>;
  updateLease: (id: string, data: Partial<Lease>) => Promise<void>;
  deleteLease: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const { data: session } = useSession();
  const { error: showError, success: showSuccess } = useToast();
  const { token: csrfToken } = useCsrf();
  const { role, activeTenantId, canManage } = usePortalAccess();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userEmail = (session?.user as { email?: string | null } | undefined)?.email;
  const isDemo = isDemoModeClient();

  // --- data loading ---

  const loadData = useCallback(async () => {
    // Demo mode: load bundled demo data — no API calls, no auth needed
    if (isDemoModeClient()) {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_PROPERTIES", payload: getDemoData<Property>("properties") });
      dispatch({ type: "SET_TENANTS", payload: getDemoData<Tenant>("tenants") });
      dispatch({ type: "SET_RECEIPTS", payload: getDemoData<Receipt>("receipts") });
      dispatch({
        type: "SET_TEMPLATES",
        payload: getDemoData<CorrespondenceTemplate>("templates"),
      });
      dispatch({
        type: "SET_CORRESPONDENCE",
        payload: getDemoData<Correspondence>("correspondence"),
      });
      dispatch({ type: "SET_OWNERS", payload: getDemoData<Owner>("owners") });
      dispatch({ type: "SET_EXPENSES", payload: getDemoData<Expense>("expenses") });
      dispatch({ type: "SET_MAINTENANCE", payload: getDemoData<MaintenanceTicket>("maintenance") });
      dispatch({ type: "SET_LEASES", payload: getDemoData<Lease>("leases") });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    // Prevent API calls if not authenticated
    if (!userId) {
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const [
        propertiesRes,
        tenantsRes,
        receiptsRes,
        templatesRes,
        correspondenceRes,
        ownersRes,
        expensesRes,
        maintenanceRes,
        leasesRes,
      ] = await Promise.all([
        apiFetch<{ data: Property[] }>("/api/properties", csrfToken),
        apiFetch<{ data: Tenant[] }>("/api/tenants", csrfToken),
        apiFetch<{ data: Receipt[] }>("/api/receipts", csrfToken),
        apiFetch<{ data: CorrespondenceTemplate[] }>("/api/correspondence/templates", csrfToken),
        apiFetch<{ data: Correspondence[] }>("/api/correspondence", csrfToken),
        apiFetch<{ data: Owner[] }>("/api/owners", csrfToken),
        apiFetch<{ data: Expense[] }>("/api/expenses", csrfToken),
        apiFetch<{ data: MaintenanceTicket[] }>("/api/maintenance", csrfToken),
        apiFetch<{ data: Lease[] }>("/api/leases", csrfToken),
      ]);

      dispatch({
        type: "SET_PROPERTIES",
        payload: (propertiesRes.data ?? propertiesRes) as Property[],
      });
      dispatch({
        type: "SET_TENANTS",
        payload: (tenantsRes.data ?? tenantsRes) as Tenant[],
      });
      dispatch({
        type: "SET_RECEIPTS",
        payload: (receiptsRes.data ?? receiptsRes) as Receipt[],
      });
      dispatch({
        type: "SET_TEMPLATES",
        payload: (templatesRes.data ?? templatesRes) as CorrespondenceTemplate[],
      });
      dispatch({
        type: "SET_CORRESPONDENCE",
        payload: (correspondenceRes.data ?? correspondenceRes) as Correspondence[],
      });
      dispatch({
        type: "SET_OWNERS",
        payload: (ownersRes.data ?? ownersRes) as Owner[],
      });
      dispatch({
        type: "SET_EXPENSES",
        payload: (expensesRes.data ?? expensesRes) as Expense[],
      });
      dispatch({
        type: "SET_MAINTENANCE",
        payload: (maintenanceRes.data ?? maintenanceRes) as MaintenanceTicket[],
      });
      dispatch({
        type: "SET_LEASES",
        payload: (leasesRes.data ?? leasesRes) as Lease[],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";

      // Check if this is a CSRF error
      const isCsrfError =
        (err instanceof Error && (err.message.includes("CSRF") || err.message.includes("csrf"))) ||
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status?: number }).status === 403);

      // For CSRF errors, suggest refresh
      const displayMessage = isCsrfError
        ? "Security token expired. Please refresh the page."
        : errorMessage;

      dispatch({ type: "SET_ERROR", payload: displayMessage });
      showError(displayMessage);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [userId, csrfToken, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => loadData(), [loadData]);

  // --- CRUD actions via factory (replaces ~500 LOC of boilerplate) ---

  const propertyActions = useMemo(
    () =>
      createEntityActions<Property>({
        endpoint: "/api/properties",
        getItems: () => state.properties,
        setItems: (items) => dispatch({ type: "SET_PROPERTIES", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "property",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.properties],
  );

  const tenantActions = useMemo(
    () =>
      createEntityActions<Tenant>({
        endpoint: "/api/tenants",
        getItems: () => state.tenants,
        setItems: (items) => dispatch({ type: "SET_TENANTS", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "tenant",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.tenants],
  );

  const receiptActions = useMemo(
    () =>
      createEntityActions<Receipt>({
        endpoint: "/api/receipts",
        getItems: () => state.receipts,
        setItems: (items) => dispatch({ type: "SET_RECEIPTS", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "receipt",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.receipts],
  );

  const templateActions = useMemo(
    () =>
      createEntityActions<CorrespondenceTemplate>({
        endpoint: "/api/correspondence/templates",
        getItems: () => state.templates,
        setItems: (items) => dispatch({ type: "SET_TEMPLATES", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "template",
        requireAuth: false,
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.templates],
  );

  const correspondenceActions = useMemo(
    () =>
      createEntityActions<Correspondence>({
        endpoint: "/api/correspondence",
        getItems: () => state.correspondence,
        setItems: (items) => dispatch({ type: "SET_CORRESPONDENCE", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "correspondence",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.correspondence],
  );

  const ownerActions = useMemo(
    () =>
      createEntityActions<Owner>({
        endpoint: "/api/owners",
        getItems: () => state.owners,
        setItems: (items) => dispatch({ type: "SET_OWNERS", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "owner",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.owners],
  );

  const expenseActions = useMemo(
    () =>
      createEntityActions<Expense>({
        endpoint: "/api/expenses",
        getItems: () => state.expenses,
        setItems: (items) => dispatch({ type: "SET_EXPENSES", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "expense",
        prependNew: true,
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.expenses],
  );

  const maintenanceActions = useMemo(
    () =>
      createEntityActions<MaintenanceTicket>({
        endpoint: "/api/maintenance",
        getItems: () => state.maintenance,
        setItems: (items) => dispatch({ type: "SET_MAINTENANCE", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "ticket",
        prependNew: true,
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.maintenance],
  );

  const leaseActions = useMemo(
    () =>
      createEntityActions<Lease>({
        endpoint: "/api/leases",
        getItems: () => state.leases,
        setItems: (items) => dispatch({ type: "SET_LEASES", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "lease",
        prependNew: true,
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.leases],
  );

  const visibleState = useMemo(
    () => filterStateForRole(state, role, activeTenantId, userEmail),
    [activeTenantId, role, state, userEmail],
  );

  const blockTenantMutation = useCallback(() => {
    showError("This action is only available in the owner portal.");
    return Promise.resolve();
  }, [showError]);

  // --- context value (backward-compatible shape) ---

  const contextValue: AppContextValue = useMemo(
    () => ({
      state: visibleState,
      dispatch,
      addProperty: canManage
        ? (d) => propertyActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateProperty: canManage
        ? (id, d) => propertyActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteProperty: canManage ? (id) => propertyActions.remove(id) : blockTenantMutation,
      addTenant: canManage
        ? (d) => tenantActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateTenant: canManage
        ? (id, d) => tenantActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteTenant: canManage ? (id) => tenantActions.remove(id) : blockTenantMutation,
      addReceipt: canManage
        ? (d) => receiptActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateReceipt: canManage
        ? (id, d) => receiptActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteReceipt: canManage ? (id) => receiptActions.remove(id) : blockTenantMutation,
      addTemplate: canManage
        ? (d) => templateActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateTemplate: canManage
        ? (id, d) => templateActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteTemplate: canManage ? (id) => templateActions.remove(id) : blockTenantMutation,
      addCorrespondence: canManage
        ? (d) => correspondenceActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateCorrespondence: canManage
        ? (id, d) => correspondenceActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteCorrespondence: canManage
        ? (id) => correspondenceActions.remove(id)
        : blockTenantMutation,
      addOwner: canManage
        ? (d) => ownerActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateOwner: canManage
        ? (id, d) => ownerActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteOwner: canManage ? (id) => ownerActions.remove(id) : blockTenantMutation,
      addExpense: canManage
        ? (d) => expenseActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      deleteExpense: canManage ? (id) => expenseActions.remove(id) : blockTenantMutation,
      addMaintenance: canManage
        ? (d) => maintenanceActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateMaintenance: canManage
        ? (id, d) => maintenanceActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteMaintenance: canManage ? (id) => maintenanceActions.remove(id) : blockTenantMutation,
      addLease: canManage
        ? (d) => leaseActions.add(d) as unknown as Promise<void>
        : blockTenantMutation,
      updateLease: canManage
        ? (id, d) => leaseActions.update(id, d) as unknown as Promise<void>
        : async () => blockTenantMutation(),
      deleteLease: canManage ? (id) => leaseActions.remove(id) : blockTenantMutation,
      refreshData,
    }),
    [
      blockTenantMutation,
      canManage,
      visibleState,
      dispatch,
      refreshData,
      propertyActions,
      tenantActions,
      receiptActions,
      templateActions,
      correspondenceActions,
      ownerActions,
      expenseActions,
      maintenanceActions,
      leaseActions,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
