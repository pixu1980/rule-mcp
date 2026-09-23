/**
 * @module components/Toast/_Toast
 *
 * Transient, accessible status banner. Uses `role="alert"` for errors (must
 * interrupt and be announced immediately) and `role="status"` for neutral
 * confirmations, per the a11y live-region guidance: assertive for critical
 * updates, polite for everything else.
 */

import cssText from "./_Toast.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";

interface ToastProps {
  tone: "error" | "info";
  children: string;
  onDismiss: () => void;
}

/** Dismissible, live-announced status message. */
export function Toast({ tone, children, onDismiss }: ToastProps) {
  useAdoptedStylesheet(cssText);

  return (
    <section data-part="toast" data-tone={tone} role={tone === "error" ? "alert" : "status"} aria-atomic="true">
      <p data-part="message">{children}</p>
      <button type="button" data-part="dismiss" onClick={onDismiss} aria-label="Dismiss message">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            d="M2 2 L14 14 M14 2 L2 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </section>
  );
}
