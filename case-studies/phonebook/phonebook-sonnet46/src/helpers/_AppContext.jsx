/**
 * @file src/helpers/_AppContext.jsx
 * @description Global application state: contacts, selection, search, grouping,
 * and editing/adding modal state. Uses React Context + useReducer.
 */
import { createContext, useContext, useReducer, useEffect } from "react";
import { SAMPLE_CONTACTS } from "./_sampleData.js";

/* -------------------------------------------------------------------------- */
/* State shape                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} AppState
 * @property {import('./_sampleData.js').Contact[]} contacts
 * @property {string|null} selectedId
 * @property {string} searchQuery
 * @property {string} activeGroup  "all"|"favorites"|"family"|"friends"|"work"
 * @property {object|null|"new"} editingContact  null=closed, "new"=adding, obj=editing
 * @property {boolean} isLoaded
 */

/** @type {AppState} */
const INITIAL_STATE = {
  contacts: [],
  selectedId: null,
  searchQuery: "",
  activeGroup: "all",
  editingContact: null,
  isLoaded: false,
};

/* -------------------------------------------------------------------------- */
/* Reducer                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Application state reducer.
 * @param {AppState} state
 * @param {{type: string, payload?: any}} action
 * @returns {AppState}
 */
function appReducer(state, action) {
  switch (action.type) {
    case "SET_CONTACTS":
      return { ...state, contacts: action.payload, isLoaded: true };

    case "SELECT":
      return { ...state, selectedId: action.payload };

    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };

    case "SET_GROUP":
      return { ...state, activeGroup: action.payload };

    case "START_EDIT":
      return { ...state, editingContact: action.payload };

    case "CLOSE_FORM":
      return { ...state, editingContact: null };

    case "SAVE_CONTACT": {
      const contact = action.payload;
      const isNew = !state.contacts.find((c) => c.id === contact.id);
      const contacts = isNew
        ? [contact, ...state.contacts]
        : state.contacts.map((c) => (c.id === contact.id ? contact : c));
      return { ...state, contacts, selectedId: contact.id, editingContact: null };
    }

    case "DELETE_CONTACT": {
      const contacts = state.contacts.filter((c) => c.id !== action.payload);
      const selectedId =
        state.selectedId === action.payload ? null : state.selectedId;
      return { ...state, contacts, selectedId };
    }

    case "TOGGLE_FAVORITE":
      return {
        ...state,
        contacts: state.contacts.map((c) =>
          c.id === action.payload ? { ...c, favorite: !c.favorite } : c
        ),
      };

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Context                                                                      */
/* -------------------------------------------------------------------------- */

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

/**
 * Provides global app state and dispatch to the component tree.
 * Bootstraps the `window.phonebook` mock when running in browser dev mode
 * (without Electron), persisting to localStorage instead.
 * @param {{ children: React.ReactNode }} props
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  /* ---- Bootstrap browser mock (no Electron) ---- */
  useEffect(() => {
    if (typeof window.phonebook === "undefined") {
      window.phonebook = {
        loadContacts: async () => {
          const raw = localStorage.getItem("phonebook_v1");
          return raw ? JSON.parse(raw) : [];
        },
        saveContacts: async (contacts) => {
          localStorage.setItem("phonebook_v1", JSON.stringify(contacts));
          return { ok: true };
        },
      };
    }
  }, []);

  /* ---- Load contacts on mount ---- */
  useEffect(() => {
    async function load() {
      const contacts = await window.phonebook.loadContacts();
      if (contacts.length === 0) {
        // First launch — seed sample data
        await window.phonebook.saveContacts(SAMPLE_CONTACTS);
        dispatch({ type: "SET_CONTACTS", payload: SAMPLE_CONTACTS });
      } else {
        dispatch({ type: "SET_CONTACTS", payload: contacts });
      }
    }
    load();
  }, []);

  /* ---- Persist on every contacts change ---- */
  useEffect(() => {
    if (!state.isLoaded) return;
    window.phonebook.saveContacts(state.contacts);
  }, [state.contacts, state.isLoaded]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

/**
 * Returns the current application state.
 * @returns {AppState}
 */
export function useAppState() {
  return useContext(AppStateContext);
}

/**
 * Returns the dispatch function for state mutations.
 * @returns {React.Dispatch}
 */
export function useAppDispatch() {
  return useContext(AppDispatchContext);
}
