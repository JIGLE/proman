"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
} from './types';
import {
  propertyService,
  tenantService,
  receiptService,
  templateService,
  correspondenceService,
  initializeDatabase,
} from './database';
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
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProperty: (id: string, property: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  // Tenant actions
  addTenant: (tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'propertyName'>) => Promise<void>;
  updateTenant: (id: string, tenant: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  // Receipt actions
  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>) => Promise<void>;
  updateReceipt: (id: string, receipt: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  // Template actions
  addTemplate: (template: Omit<CorrespondenceTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<CorrespondenceTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  // Correspondence actions
  addCorrespondence: (correspondence: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt' | 'tenantName'>) => Promise<void>;
  updateCorrespondence: (id: string, correspondence: Partial<Correspondence>) => Promise<void>;
  deleteCorrespondence: (id: string) => Promise<void>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const { error: showError } = useToast();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        // Initialize database and seed if needed
        await initializeDatabase();

        // Load all data in parallel
        const [properties, tenants, receipts, templates, correspondence] = await Promise.all([
          propertyService.getAll(),
          tenantService.getAll(),
          receiptService.getAll(),
          templateService.getAll(),
          correspondenceService.getAll(),
        ]);

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
  const addProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProperty = await propertyService.create(propertyData);
      dispatch({ type: 'SET_PROPERTIES', payload: [...state.properties, newProperty] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add property';
      showError(errorMessage);
      throw err;
    }
  };

  const updateProperty = async (id: string, propertyData: Partial<Property>) => {
    try {
      const updatedProperty = await propertyService.update(id, propertyData);
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
    try {
      await propertyService.delete(id);
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
  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'propertyName'>) => {
    try {
      const newTenant = await tenantService.create(tenantData);
      dispatch({ type: 'SET_TENANTS', payload: [...state.tenants, newTenant] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tenant';
      showError(errorMessage);
      throw err;
    }
  };

  const updateTenant = async (id: string, tenantData: Partial<Tenant>) => {
    try {
      const updatedTenant = await tenantService.update(id, tenantData);
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
    try {
      await tenantService.delete(id);
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
  const addReceipt = async (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'tenantName' | 'propertyName'>) => {
    try {
      const newReceipt = await receiptService.create(receiptData);
      dispatch({ type: 'SET_RECEIPTS', payload: [...state.receipts, newReceipt] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add receipt';
      showError(errorMessage);
      throw err;
    }
  };

  const updateReceipt = async (id: string, receiptData: Partial<Receipt>) => {
    try {
      const updatedReceipt = await receiptService.update(id, receiptData);
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
    try {
      await receiptService.delete(id);
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
      const newTemplate = await templateService.create(templateData);
      dispatch({ type: 'SET_TEMPLATES', payload: [...state.templates, newTemplate] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add template';
      showError(errorMessage);
      throw err;
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<CorrespondenceTemplate>) => {
    try {
      const updatedTemplate = await templateService.update(id, templateData);
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
      await templateService.delete(id);
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
  const addCorrespondence = async (correspondenceData: Omit<Correspondence, 'id' | 'createdAt' | 'updatedAt' | 'tenantName'>) => {
    try {
      const newCorrespondence = await correspondenceService.create(correspondenceData);
      dispatch({ type: 'SET_CORRESPONDENCE', payload: [...state.correspondence, newCorrespondence] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add correspondence';
      showError(errorMessage);
      throw err;
    }
  };

  const updateCorrespondence = async (id: string, correspondenceData: Partial<Correspondence>) => {
    try {
      const updatedCorrespondence = await correspondenceService.update(id, correspondenceData);
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
    try {
      await correspondenceService.delete(id);
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

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}