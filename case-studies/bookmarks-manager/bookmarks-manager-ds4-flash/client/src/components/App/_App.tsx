/**
 * @module components/App/_App
 * Root app layout component with Outlet for nested routes.
 */

import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../Header/_Header.js";
import { Layout } from "../Layout/_Layout.js";
import cssText from "./_App.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function App() {
  const ref = useRef<HTMLBodyElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.dataset.part) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.body.dataset.part = "app-shell";
    }
  }, []);

  useEffect(() => {
    document.title = "Bookmarks Manager";
  }, []);

  return (
    <Layout ref={ref}>
      <Header />
      <main data-part="main-content">
        <Outlet />
      </main>
    </Layout>
  );
}
