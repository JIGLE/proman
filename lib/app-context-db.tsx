"use client";

import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
} from './types';
// Import database helpers dynamically inside the client runtime to avoid bundling
// server-only modules (Prisma, better-sqlite3) into client bundles.
import { useToast } from './toast-context';

interface AppState {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  templates: CorrespondenceTemplate[];
  correspondence: Correspondence[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROPERTIES'; payload: Property[] }
  | { type: 'SET_TENANTS'; payload: Tenant[] }
  | { type: 'SET_RECEIPTS'; payload: Receipt[] }
  | { type: 'SET_TEMPLATES'; payload: CorrespondenceTemplate[] }
  | { type: 'SET_CORRESPONDENCE'; payload: Correspondence[] };

const initialState: AppState = {
  properties: [],
  tenants: [],
  receipts: [],
  templates: [],
  correspondence: [],
  loading: true,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PROPERTIES':
      return { ...state, properties: action.payload };
    case 'SET_TENANTS':
      return { ...state, tenants: action.payload };
    case 'SET_RECEIPTS':
      return { ...state, receipts: action.payload };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    case 'SET_CORRESPONDENCE':
      return { ...state, correspondence: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Property actions
  addProperty: (property: Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProperty: (id: string, property: Partial<Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  // Tenant actions
  addTenant: (tenant: Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>) => Promise<void>;
  updateTenant: (id: string, tenant: Partial<Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  // Receipt actions
  addReceipt: (receipt: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>) => Promise<void>;
  updateReceipt: (id: string, receipt: Partial<Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  // Template actions
  addTemplate: (template: Omit<CorrespondenceTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<CorrespondenceTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  // Correspondence actions
  addCorrespondence: (correspondence: Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>) => Promise<void>;
  updateCorrespondence: (id: string, correspondence: Partial<Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>>) => Promise<void>;
  deleteCorrespondence: (id: string) => Promise<void>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const { data: session } = useSession();
  const { error: showError } = useToast();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  // Use the server API routes from client code to avoid bundling server-only modules
  async function apiFetch(path: string, method = 'GET', body?: unknown) {
    const opts: RequestInit = {
      method,
      credentials: 'include',
      headers: {},
    };
    if (body !== undefined) {
      (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
    return data;
  }

  // Load initial data
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        // Initialize database and seed if needed (server-side handler)
        await apiFetch('/api/debug/db/init', 'POST');

        // Load all data in parallel via server API endpoints
        const [propertiesRes, tenantsRes, receiptsRes, templatesRes, correspondenceRes] = await Promise.all([
          apiFetch('/api/properties'),
          apiFetch('/api/tenants'),
          apiFetch('/api/receipts'),
          apiFetch('/api/correspondence/templates'),
          apiFetch('/api/correspondence'),
        ]);

        const properties = propertiesRes?.data ?? propertiesRes;
        const tenants = tenantsRes?.data ?? tenantsRes;
        const receipts = receiptsRes?.data ?? receiptsRes;
        const templates = templatesRes?.data ?? templatesRes;
        const correspondence = correspondenceRes?.data ?? correspondenceRes;

        dispatch({ type: 'SET_PROPERTIES', payload: properties });
        dispatch({ type: 'SET_TENANTS', payload: tenants });
        dispatch({ type: 'SET_RECEIPTS', payload: receipts });
        dispatch({ type: 'SET_TEMPLATES', payload: templates });
        dispatch({ type: 'SET_CORRESPONDENCE', payload: correspondence });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        showError(errorMessage);
        console.error('Error loading data:', err);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadData();
  }, [showError]);

  // Property actions
  const addProperty = async (propertyData: Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch('/api/properties', 'POST', propertyData);
      const newProperty = res.data;
      dispatch({ type: 'SET_PROPERTIES', payload: [...state.properties, newProperty] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add property';
      showError(errorMessage);
      throw err;
    }
  };

  const updateProperty = async (id: string, propertyData: Partial<Omit<Property, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch(`/api/properties/${id}`, 'PUT', propertyData);
      const updatedProperty = res.data;
      dispatch({
        type: 'SET_PROPERTIES',
        payload: state.properties.map(p => p.id === id ? updatedProperty : p)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property';
      showError(errorMessage);
      throw err;
    }
  };

  const deleteProperty = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await apiFetch(`/api/properties/${id}`, 'DELETE');
      dispatch({
        type: 'SET_PROPERTIES',
        payload: state.properties.filter(p => p.id !== id)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete property';
      showError(errorMessage);
      throw err;
    }
  };

  // Tenant actions
  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch('/api/tenants', 'POST', tenantData);
      const newTenant = res.data;
      dispatch({ type: 'SET_TENANTS', payload: [...state.tenants, newTenant] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tenant';
      showError(errorMessage);
      throw err;
    }
  };

  const updateTenant = async (id: string, tenantData: Partial<Omit<Tenant, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'propertyName'>>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch(`/api/tenants/${id}`, 'PUT', tenantData);
      const updatedTenant = res.data;
      dispatch({
        type: 'SET_TENANTS',
        payload: state.tenants.map(t => t.id === id ? updatedTenant : t)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tenant';
      showError(errorMessage);
      throw err;
    }
  };

  const deleteTenant = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await apiFetch(`/api/tenants/${id}`, 'DELETE');
      dispatch({
        type: 'SET_TENANTS',
        payload: state.tenants.filter(t => t.id !== id)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tenant';
      showError(errorMessage);
      throw err;
    }
  };

  // Receipt actions
  const addReceipt = async (receiptData: Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch('/api/receipts', 'POST', receiptData);
      const newReceipt = res.data;
      dispatch({ type: 'SET_RECEIPTS', payload: [...state.receipts, newReceipt] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add receipt';
      showError(errorMessage);
      throw err;
    }
  };

  const updateReceipt = async (id: string, receiptData: Partial<Omit<Receipt, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch(`/api/receipts/${id}`, 'PUT', receiptData);
      const updatedReceipt = res.data;
      dispatch({
        type: 'SET_RECEIPTS',
        payload: state.receipts.map(r => r.id === id ? updatedReceipt : r)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update receipt';
      showError(errorMessage);
      throw err;
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await apiFetch(`/api/receipts/${id}`, 'DELETE');
      dispatch({
        type: 'SET_RECEIPTS',
        payload: state.receipts.filter(r => r.id !== id)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete receipt';
      showError(errorMessage);
      throw err;
    }
  };

  // Template actions
  const addTemplate = async (templateData: Omit<CorrespondenceTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await apiFetch('/api/correspondence/templates', 'POST', templateData);
      const newTemplate = res.data;
      dispatch({ type: 'SET_TEMPLATES', payload: [...state.templates, newTemplate] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add template';
      showError(errorMessage);
      throw err;
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<CorrespondenceTemplate>) => {
    try {
      const res = await apiFetch(`/api/correspondence/templates/${id}`, 'PUT', templateData);
      const updatedTemplate = res.data;
      dispatch({
        type: 'SET_TEMPLATES',
        payload: state.templates.map(t => t.id === id ? updatedTemplate : t)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      showError(errorMessage);
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiFetch(`/api/correspondence/templates/${id}`, 'DELETE');
      dispatch({
        type: 'SET_TEMPLATES',
        payload: state.templates.filter(t => t.id !== id)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      showError(errorMessage);
      throw err;
    }
  };

  // Correspondence actions
  const addCorrespondence = async (correspondenceData: Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch('/api/correspondence', 'POST', correspondenceData);
      const newCorrespondence = res.data;
      dispatch({ type: 'SET_CORRESPONDENCE', payload: [...state.correspondence, newCorrespondence] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add correspondence';
      showError(errorMessage);
      throw err;
    }
  };

  const updateCorrespondence = async (id: string, correspondenceData: Partial<Omit<Correspondence, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'tenantName'>>) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      const res = await apiFetch(`/api/correspondence/${id}`, 'PUT', correspondenceData);
      const updatedCorrespondence = res.data;
      dispatch({
        type: 'SET_CORRESPONDENCE',
        payload: state.correspondence.map(c => c.id === id ? updatedCorrespondence : c)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update correspondence';
      showError(errorMessage);
      throw err;
    }
  };

  const deleteCorrespondence = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    try {
      await apiFetch(`/api/correspondence/${id}`, 'DELETE');
      dispatch({
        type: 'SET_CORRESPONDENCE',
        payload: state.correspondence.filter(c => c.id !== id)
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete correspondence';
      showError(errorMessage);
      throw err;
    }
  };

  const contextValue = {
    state,
    dispatch,
    addProperty,
    updateProperty,
    deleteProperty,
    addTenant,
    updateTenant,
    deleteTenant,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addCorrespondence,
    updateCorrespondence,
    deleteCorrespondence,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): NonNullable<React.ContextType<typeof AppContext>> {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}