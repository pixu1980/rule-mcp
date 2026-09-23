/**
 * FILE: _AppContext.jsx
 * USAGE: Global state management via React Context + useReducer.
 * Manages contacts list, selected contact, search query, and modal state.
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";

/* ─── Constants ─── */

const CATEGORIES = [
  { id: "all", label: "Tutti" },
  { id: "friends", label: "Amici" },
  { id: "family", label: "Famiglia" },
  { id: "work", label: "Lavoro" },
];

const INITIAL_STATE = {
  contacts: [],
  selectedId: null,
  searchQuery: "",
  categoryFilter: "all",
  isLoading: true,
  error: null,
  showForm: false,
  editingContact: null,
  showDeleteModal: false,
  contactToDelete: null,
};

/* ─── Action Types ─── */

const ACTIONS = {
  SET_CONTACTS: "SET_CONTACTS",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SELECT_CONTACT: "SELECT_CONTACT",
  SET_SEARCH: "SET_SEARCH",
  SET_CATEGORY: "SET_CATEGORY",
  ADD_CONTACT: "ADD_CONTACT",
  UPDATE_CONTACT: "UPDATE_CONTACT",
  DELETE_CONTACT: "DELETE_CONTACT",
  SHOW_FORM: "SHOW_FORM",
  HIDE_FORM: "HIDE_FORM",
  SET_EDITING: "SET_EDITING",
  SHOW_DELETE_MODAL: "SHOW_DELETE_MODAL",
  HIDE_DELETE_MODAL: "HIDE_DELETE_MODAL",
  SET_CONTACT_TO_DELETE: "SET_CONTACT_TO_DELETE",
};

/* ─── Reducer ─── */

function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CONTACTS:
      return { ...state, contacts: action.payload, isLoading: false, error: null };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ACTIONS.SELECT_CONTACT:
      return { ...state, selectedId: action.payload, showForm: false, editingContact: null };
    case ACTIONS.SET_SEARCH:
      return { ...state, searchQuery: action.payload };
    case ACTIONS.SET_CATEGORY:
      return { ...state, categoryFilter: action.payload };
    case ACTIONS.ADD_CONTACT:
      return { ...state, contacts: [action.payload, ...state.contacts] };
    case ACTIONS.UPDATE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };
    case ACTIONS.DELETE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.filter((c) => c.id !== action.payload),
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
      };
    case ACTIONS.SHOW_FORM:
      return { ...state, showForm: true };
    case ACTIONS.HIDE_FORM:
      return { ...state, showForm: false, editingContact: null };
    case ACTIONS.SET_EDITING:
      return { ...state, editingContact: action.payload, showForm: true };
    case ACTIONS.SHOW_DELETE_MODAL:
      return { ...state, showDeleteModal: true };
    case ACTIONS.HIDE_DELETE_MODAL:
      return { ...state, showDeleteModal: false, contactToDelete: null };
    case ACTIONS.SET_CONTACT_TO_DELETE:
      return { ...state, contactToDelete: action.payload, showDeleteModal: true };
    default:
      return state;
  }
}

/* ─── Context ─── */

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

/* ─── Provider ─── */

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  /* Load contacts from Electron IPC on mount */
  useEffect(() => {
    const load = async () => {
      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        const result = await window.qt.loadContacts();
        if (result.ok) {
          dispatch({ type: ACTIONS.SET_CONTACTS, payload: result.contacts });
        } else {
          dispatch({ type: ACTIONS.SET_ERROR, payload: result.error });
        }
      } catch (err) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: err.message });
      }
    };
    load();
  }, []);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

/* ─── Hooks ─── */

function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

function useAppDispatch() {
  const ctx = useContext(AppDispatchContext);
  if (!ctx) throw new Error("useAppDispatch must be used within AppProvider");
  return ctx;
}

export { AppProvider, useAppState, useAppDispatch, ACTIONS, CATEGORIES };
