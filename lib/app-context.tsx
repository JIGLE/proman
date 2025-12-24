"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  Property,
  Tenant,
  Receipt,
  CorrespondenceTemplate,
  Correspondence,
  initialProperties,
  initialTenants,
  initialReceipts,
  initialTemplates,
  initialCorrespondence,
} from './types';

interface AppState {
  properties: Property[];
  tenants: Tenant[];
  receipts: Receipt[];
  templates: CorrespondenceTemplate[];
  correspondence: Correspondence[];
}

type AppAction =
  | { type: 'ADD_PROPERTY'; payload: Property }
  | { type: 'UPDATE_PROPERTY'; payload: Property }
  | { type: 'DELETE_PROPERTY'; payload: string }
  | { type: 'ADD_TENANT'; payload: Tenant }
  | { type: 'UPDATE_TENANT'; payload: Tenant }
  | { type: 'DELETE_TENANT'; payload: string }
  | { type: 'ADD_RECEIPT'; payload: Receipt }
  | { type: 'UPDATE_RECEIPT'; payload: Receipt }
  | { type: 'DELETE_RECEIPT'; payload: string }
  | { type: 'ADD_TEMPLATE'; payload: CorrespondenceTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: CorrespondenceTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'ADD_CORRESPONDENCE'; payload: Correspondence }
  | { type: 'UPDATE_CORRESPONDENCE'; payload: Correspondence }
  | { type: 'DELETE_CORRESPONDENCE'; payload: string };

const initialState: AppState = {
  properties: initialProperties,
  tenants: initialTenants,
  receipts: initialReceipts,
  templates: initialTemplates,
  correspondence: initialCorrespondence,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PROPERTY':
      return { ...state, properties: [...state.properties, action.payload] };
    case 'UPDATE_PROPERTY':
      return {
        ...state,
        properties: state.properties.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PROPERTY':
      return {
        ...state,
        properties: state.properties.filter(p => p.id !== action.payload),
      };
    case 'ADD_TENANT':
      return { ...state, tenants: [...state.tenants, action.payload] };
    case 'UPDATE_TENANT':
      return {
        ...state,
        tenants: state.tenants.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TENANT':
      return {
        ...state,
        tenants: state.tenants.filter(t => t.id !== action.payload),
      };
    case 'ADD_RECEIPT':
      return { ...state, receipts: [...state.receipts, action.payload] };
    case 'UPDATE_RECEIPT':
      return {
        ...state,
        receipts: state.receipts.map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_RECEIPT':
      return {
        ...state,
        receipts: state.receipts.filter(r => r.id !== action.payload),
      };
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] };
    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.filter(t => t.id !== action.payload),
      };
    case 'ADD_CORRESPONDENCE':
      return { ...state, correspondence: [...state.correspondence, action.payload] };
    case 'UPDATE_CORRESPONDENCE':
      return {
        ...state,
        correspondence: state.correspondence.map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CORRESPONDENCE':
      return {
        ...state,
        correspondence: state.correspondence.filter(c => c.id !== action.payload),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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