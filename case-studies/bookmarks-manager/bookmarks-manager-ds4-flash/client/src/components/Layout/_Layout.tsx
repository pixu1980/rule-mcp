/**
 * @module components/Layout/_Layout
 * Outlet wrapper — minimal layout shell.
 */

import { forwardRef } from "react";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = forwardRef<HTMLBodyElement, LayoutProps>(
  function Layout({ children }, ref) {
    return (
      <>
        {/* body gets the data-part via App useEffect */}
        {children}
      </>
    );
  },
);
