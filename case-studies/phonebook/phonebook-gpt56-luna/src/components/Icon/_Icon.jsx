/**
 * Small inline icon set kept local for crisp desktop rendering and zero network dependency.
 * @param {{name: string, size?: number}} props Icon properties.
 * @returns {JSX.Element} Accessible decorative SVG icon.
 */
export function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
    clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 19c.5-3 2.5-5 6-5s5.5 2 6 5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.4.2 3.8 1.8 4 4"/></>,
    phone: <path d="M7 4.5 9.5 4l2 4-2 1.5c.8 1.7 2.3 3.2 4 4L15 12l4 2-.5 2.5c-.2 1.1-1.2 1.8-2.3 1.6C10.2 17 7 13.8 5.9 7.8 5.7 6.7 6.4 4.7 7 4.5Z"/>,
    mail: <><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    pin: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    edit: <path d="m4 17.5-.7 3.2 3.2-.7L19 7.5 16.5 5 4 17.5ZM15 6.5l2.5 2.5"/>,
    trash: <><path d="M5 7h14M10 11v5M14 11v5M8 7l.7-2h6.6l.7 2M7 7l.8 13h8.4L17 7"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    arrow: <path d="M5 12h13m-5-5 5 5-5 5"/>,
  };
  return <svg data-part="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.more}</svg>;
}
