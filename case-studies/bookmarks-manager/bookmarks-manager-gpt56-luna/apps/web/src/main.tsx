/** Browser entry point; installs one shared external CSSStyleSheet before mounting React. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import cssText from "./styles/_global.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

const root = document.getElementById("root");
if (!root) throw new Error("Luma root element missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
