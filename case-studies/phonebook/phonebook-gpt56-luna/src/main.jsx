/**
 * React renderer entry point for Orbit Contacts.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OrbitApp } from "./components/OrbitApp/index.js";

createRoot(document.getElementById("root")).render(<StrictMode><OrbitApp /></StrictMode>);
