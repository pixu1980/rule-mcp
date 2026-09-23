/**
 * FILE: index.jsx
 * USAGE: Application entry point — renders the App component with context providers.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "@/context/_AppContext.jsx";
import { App } from "@/components/App/index.js";
import { generateSeedContacts } from "./seed-data.js";

// ── Load design system global styles ──

import "@/design-system/_reset.css";
import "@/design-system/_tokens.css";
import "@/design-system/_typography.css";
import "@/design-system/_motion.css";

// ── Mock IPC for browser dev mode ──

const SEED = generateSeedContacts();

if (typeof window.qt === "undefined") {
  window.qt = {
    loadContacts: async () => ({ ok: true, contacts: SEED }),
    saveContact: async (data) => {
      const contact = { ...data, id: "mock-" + Date.now() };
      SEED.unshift(contact);
      return { ok: true, contact };
    },
    deleteContact: async (id) => {
      const idx = SEED.findIndex((c) => c.id === id);
      if (idx !== -1) SEED.splice(idx, 1);
      return { ok: true };
    },
    getContact: async (id) => {
      const contact = SEED.find((c) => c.id === id);
      return contact ? { ok: true, contact } : { ok: false, error: "Not found" };
    },
  };
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>,
  );
}
