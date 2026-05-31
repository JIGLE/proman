"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Building,
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
import { usePortalAccess } from "@/lib/contexts/portal-context";
import { isPublicPagePath } from "@/lib/utils/public-route";

interface AppState {
  buildings: Building[];
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
  | { type: "SET_BUILDINGS"; payload: Building[] }
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
  buildings: [],
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
    case "SET_BUILDINGS":
      return { ...state, buildings: action.payload };
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
  addBuilding: (data: Partial<Building>) => Promise<void>;
  updateBuilding: (id: string, data: Partial<Building>) => Promise<void>;
  deleteBuilding: (id: string) => Promise<void>;
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
  const pathname = usePathname();
  const { portalRole, tenantEmail, tenantId: selectedTenantId } = usePortalAccess();
  const { error: showError, success: showSuccess } = useToast();
  const { token: csrfToken } = useCsrf();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isDemo = isDemoModeClient();
  const isPublicPage = isPublicPagePath(pathname);
  const loadControlRef = useRef<{ inFlight: boolean; lastKey: string | null }>({
    inFlight: false,
    lastKey: null,
  });

  // --- data loading ---

  const loadData = useCallback(
    async (force = false) => {
      const loadKey = `${isPublicPage ? "public" : "private"}|${userId ?? "anon"}|${csrfToken ?? "nocsrf"}|${isDemo ? "demo" : "live"}`;

      // Prevent request storms from effect/dependency churn.
      if (!force) {
        if (loadControlRef.current.inFlight) {
          return;
        }
        if (loadControlRef.current.lastKey === loadKey) {
          return;
        }
      }

      loadControlRef.current.inFlight = true;
      loadControlRef.current.lastKey = loadKey;

      // Do not preload protected dashboard data on public routes (landing/auth/demo).
      if (isPublicPage) {
        dispatch({ type: "SET_LOADING", payload: false });
        loadControlRef.current.inFlight = false;
        return;
      }

      // Demo mode: load bundled demo data — no API calls, no auth needed
      if (isDemoModeClient()) {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });
        dispatch({ type: "SET_PROPERTIES", payload: getDemoData<Property>("properties") });
        dispatch({ type: "SET_BUILDINGS", payload: getDemoData<Building>("buildings") });
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
        dispatch({
          type: "SET_MAINTENANCE",
          payload: getDemoData<MaintenanceTicket>("maintenance"),
        });
        dispatch({ type: "SET_LEASES", payload: getDemoData<Lease>("leases") });
        dispatch({ type: "SET_LOADING", payload: false });
        loadControlRef.current.inFlight = false;
        return;
      }

      // Prevent API calls if not authenticated
      if (!userId) {
        dispatch({ type: "SET_LOADING", payload: false });
        loadControlRef.current.inFlight = false;
        return;
      }
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        const [
          propertiesRes,
          buildingsRes,
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
          apiFetch<{ data: Building[] }>("/api/buildings", csrfToken),
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
          type: "SET_BUILDINGS",
          payload: (buildingsRes.data ?? buildingsRes) as Building[],
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
          (err instanceof Error &&
            (err.message.includes("CSRF") || err.message.includes("csrf"))) ||
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
        loadControlRef.current.inFlight = false;
      }
    },
    [userId, csrfToken, showError, isPublicPage, isDemo],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => loadData(true), [loadData]);

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

  const buildingActions = useMemo(
    () =>
      createEntityActions<Building>({
        endpoint: "/api/buildings",
        getItems: () => state.buildings,
        setItems: (items) => dispatch({ type: "SET_BUILDINGS", payload: items }),
        showError,
        showSuccess,
        csrfToken,
        userId,
        entityName: "building",
        isDemo,
      }),
    [csrfToken, userId, showError, showSuccess, isDemo, state.buildings],
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

  const scopedState = useMemo(() => {
    if (portalRole !== "tenant") {
      return state;
    }

    const activeTenant =
      (selectedTenantId
        ? state.tenants.find((tenant) => tenant.id === selectedTenantId)
        : undefined) ??
      (tenantEmail ? state.tenants.find((tenant) => tenant.email === tenantEmail) : undefined);

    if (!activeTenant) {
      return {
        ...state,
        properties: [],
        tenants: [],
        receipts: [],
        templates: [],
        correspondence: [],
        owners: [],
        expenses: [],
        maintenance: [],
        leases: [],
      };
    }

    const tenantPropertyIds = new Set(
      [
        activeTenant.propertyId,
        ...state.leases
          .filter((lease) => lease.tenantId === activeTenant.id)
          .map((lease) => lease.propertyId),
      ].filter(Boolean) as string[],
    );

    return {
      ...state,
      properties: state.properties.filter((property) => tenantPropertyIds.has(property.id)),
      tenants: [activeTenant],
      receipts: state.receipts.filter((receipt) => receipt.tenantId === activeTenant.id),
      templates: [],
      correspondence: state.correspondence.filter(
        (correspondence) => correspondence.tenantId === activeTenant.id,
      ),
      owners: [],
      expenses: [],
      maintenance: state.maintenance.filter(
        (ticket) =>
          ticket.tenantId === activeTenant.id ||
          (ticket.propertyId ? tenantPropertyIds.has(ticket.propertyId) : false),
      ),
      leases: state.leases.filter((lease) => lease.tenantId === activeTenant.id),
    };
  }, [portalRole, selectedTenantId, state, tenantEmail]);

  // --- context value (backward-compatible shape) ---

  const contextValue: AppContextValue = useMemo(
    () => ({
      state: scopedState,
      dispatch,
      addBuilding: (d) => buildingActions.add(d) as unknown as Promise<void>,
      updateBuilding: (id, d) => buildingActions.update(id, d) as unknown as Promise<void>,
      deleteBuilding: (id) => buildingActions.remove(id),
      addProperty: (d) => propertyActions.add(d) as unknown as Promise<void>,
      updateProperty: (id, d) => propertyActions.update(id, d) as unknown as Promise<void>,
      deleteProperty: (id) => propertyActions.remove(id),
      addTenant: (d) => tenantActions.add(d) as unknown as Promise<void>,
      updateTenant: (id, d) => tenantActions.update(id, d) as unknown as Promise<void>,
      deleteTenant: (id) => tenantActions.remove(id),
      addReceipt: (d) => receiptActions.add(d) as unknown as Promise<void>,
      updateReceipt: (id, d) => receiptActions.update(id, d) as unknown as Promise<void>,
      deleteReceipt: (id) => receiptActions.remove(id),
      addTemplate: (d) => templateActions.add(d) as unknown as Promise<void>,
      updateTemplate: (id, d) => templateActions.update(id, d) as unknown as Promise<void>,
      deleteTemplate: (id) => templateActions.remove(id),
      addCorrespondence: (d) => correspondenceActions.add(d) as unknown as Promise<void>,
      updateCorrespondence: (id, d) =>
        correspondenceActions.update(id, d) as unknown as Promise<void>,
      deleteCorrespondence: (id) => correspondenceActions.remove(id),
      addOwner: (d) => ownerActions.add(d) as unknown as Promise<void>,
      updateOwner: (id, d) => ownerActions.update(id, d) as unknown as Promise<void>,
      deleteOwner: (id) => ownerActions.remove(id),
      addExpense: (d) => expenseActions.add(d) as unknown as Promise<void>,
      deleteExpense: (id) => expenseActions.remove(id),
      addMaintenance: (d) => maintenanceActions.add(d) as unknown as Promise<void>,
      updateMaintenance: (id, d) => maintenanceActions.update(id, d) as unknown as Promise<void>,
      deleteMaintenance: (id) => maintenanceActions.remove(id),
      addLease: (d) => leaseActions.add(d) as unknown as Promise<void>,
      updateLease: (id, d) => leaseActions.update(id, d) as unknown as Promise<void>,
      deleteLease: (id) => leaseActions.remove(id),
      refreshData,
    }),
    [
      scopedState,
      dispatch,
      refreshData,
      buildingActions,
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
