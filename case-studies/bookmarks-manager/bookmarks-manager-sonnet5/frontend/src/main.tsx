/**
 * @module main
 *
 * Application entry point: mounts {@link App} into `#root` and loads the
 * global design-token and base stylesheets.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/base.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
