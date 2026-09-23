/**
 * @file src/main.jsx
 * @description React application entry point.
 * Mounts the App component and injects global design tokens.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./design-system/tokens.css";
import "./styles/global.css";
import { App } from "./components/App/index.js";

const root = document.getElementById("root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
