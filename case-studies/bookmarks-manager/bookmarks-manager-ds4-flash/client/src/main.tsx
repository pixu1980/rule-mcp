/**
 * @module main
 * Application entry point. Mounts React app with router.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./components/App/_App.js";
import { Home } from "./pages/Home/_Home.js";
import { NotFound } from "./pages/NotFound/_NotFound.js";

/* Vite injects design-system.css as global stylesheet */
import "./design-system.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
