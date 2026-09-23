/**
 * Orbit Contacts application shell: navigation, search, list, details, and contact creation flow.
 */
import { useEffect, useMemo, useReducer, useState } from "react";
import { Icon } from "../Icon/index.js";
import { formatContactDate, getInitials, getVisibleContacts, loadContacts, saveContacts } from "../../helpers/index.js";
import "./_OrbitApp.css";

const initialForm = { firstName: "", lastName: "", role: "", company: "", email: "", phone: "", location: "", note: "" };
const avatarColors = ["coral", "blue", "lilac", "mint", "peach", "gold", "rose", "green"];

function contactsReducer(state, action) {
  switch (action.type) {
    case "loaded": return { ...state, contacts: action.contacts, selectedId: action.contacts[0]?.id ?? null, loading: false };
    case "select": return { ...state, selectedId: action.id };
    case "replace": return { ...state, contacts: action.contacts };
    default: return state;
  }
}

function ContactAvatar({ contact, size = "normal" }) {
  return <span data-part="avatar" data-color={contact.color ?? "blue"} data-size={size} aria-hidden="true">{getInitials(contact)}</span>;
}

function NavButton({ icon, label, count, active, onClick }) {
  return <button type="button" data-part="nav-button" data-active={active ? "true" : "false"} onClick={onClick} aria-current={active ? "page" : undefined}>
    <Icon name={icon} size={17} /><span data-part="nav-label">{label}</span>{count ? <strong data-part="nav-count">{count}</strong> : null}
  </button>;
}

function ContactCard({ contact, selected, onSelect }) {
  return <li data-part="contact-item">
    <button type="button" data-part="contact-card" data-selected={selected ? "true" : "false"} onClick={() => onSelect(contact.id)} aria-pressed={selected}>
      <ContactAvatar contact={contact} />
      <span data-part="contact-copy"><strong data-part="contact-name">{contact.displayName}</strong><small data-part="contact-role">{contact.role} · {contact.company}</small></span>
      <span data-part="contact-trailing"><time dateTime={contact.updatedAt}>{formatContactDate(contact.updatedAt)}</time>{contact.favorite ? <Icon name="star" size={13} /> : null}</span>
    </button>
  </li>;
}

function ContactDetail({ contact, onDelete }) {
  if (!contact) return <aside data-part="detail" data-empty="true"><span data-part="detail-empty-icon"><Icon name="users" size={26} /></span><h2>Select a contact</h2><p>Choose someone from your circle to see their details.</p></aside>;
  const displayName = contact.displayName ?? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  return <aside data-part="detail" aria-label={`${displayName} details`}>
    <header data-part="detail-header"><button type="button" data-part="more-button" aria-label="More contact actions"><Icon name="more" /></button></header>
    <section data-part="profile-hero"><ContactAvatar contact={contact} size="large" /><span data-part="profile-presence"><i aria-hidden="true" />In your contacts</span><h2>{displayName}</h2><p>{contact.role}</p><strong data-part="profile-company">{contact.company}</strong><ul data-part="tag-list">{contact.tags?.map((tag) => <li key={tag}>{tag}</li>)}</ul></section>
    <section data-part="detail-section"><h3>Contact</h3><ul data-part="info-list">
      <li><span data-part="info-icon"><Icon name="phone" size={15} /></span><span><small>Mobile</small><a href={`tel:${contact.phone}`}>{contact.phone}</a></span></li>
      <li><span data-part="info-icon"><Icon name="mail" size={15} /></span><span><small>Email</small><a href={`mailto:${contact.email}`}>{contact.email}</a></span></li>
      <li><span data-part="info-icon"><Icon name="pin" size={15} /></span><span><small>Based in</small><strong>{contact.location}</strong></span></li>
      <li><span data-part="info-icon"><Icon name="calendar" size={15} /></span><span><small>Birthday</small><strong>{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(contact.birthday))}</strong></span></li>
    </ul></section>
    <section data-part="detail-section"><h3>Notes</h3><p data-part="note">{contact.note}</p></section>
    <footer data-part="detail-footer"><small>Last updated {formatContactDate(contact.updatedAt)}</small><button type="button" data-part="delete-button" onClick={() => onDelete(contact.id)}><Icon name="trash" size={14} />Delete</button></footer>
  </aside>;
}

function AddContactDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  useEffect(() => { if (open) setForm(initialForm); }, [open]);
  if (!open) return null;
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => { event.preventDefault(); if (!form.firstName.trim() || !form.lastName.trim()) return; onCreate(form); setForm(initialForm); };
  return <dialog open data-part="dialog" aria-labelledby="dialog-title">
    <form method="dialog" data-part="dialog-form" onSubmit={submit}>
      <header data-part="dialog-header"><span data-part="eyebrow">New connection</span><button type="button" data-part="close-button" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button><h2 id="dialog-title">Add a contact</h2><p>Keep the people who matter close.</p></header>
      <fieldset><legend>Identity</legend><label>First name<input name="firstName" value={form.firstName} onChange={update} required autoFocus placeholder="Maya" /></label><label>Last name<input name="lastName" value={form.lastName} onChange={update} required placeholder="Chen" /></label></fieldset>
      <fieldset><legend>Details</legend><label>Role<input name="role" value={form.role} onChange={update} placeholder="Creative Director" /></label><label>Company<input name="company" value={form.company} onChange={update} placeholder="Northstar Studio" /></label><label>Email<input type="email" name="email" value={form.email} onChange={update} placeholder="hello@example.com" /></label><label>Phone<input name="phone" value={form.phone} onChange={update} placeholder="+1 415 555 0184" /></label></fieldset>
      <footer data-part="dialog-footer"><button type="button" data-part="secondary-button" onClick={onClose}>Cancel</button><button type="submit" data-part="primary-button">Create contact <Icon name="arrow" size={15} /></button></footer>
    </form>
  </dialog>;
}

/**
 * Render the complete Orbit Contacts desktop experience.
 * @returns {JSX.Element} Contact book application.
 */
export function OrbitApp() {
  const [{ contacts, selectedId, loading }, dispatch] = useReducer(contactsReducer, { contacts: [], selectedId: null, loading: true });
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => { loadContacts().then((loaded) => dispatch({ type: "loaded", contacts: loaded })); }, []);
  const visibleContacts = useMemo(() => getVisibleContacts(contacts, { query, view }), [contacts, query, view]);
  const selectedContact = contacts.find((contact) => contact.id === selectedId);
  const favoritesCount = contacts.filter((contact) => contact.favorite).length;
  const replaceContacts = (next) => { dispatch({ type: "replace", contacts: next }); saveContacts(next); };
  const createContact = (form) => { const contact = { ...form, id: `${form.firstName.toLowerCase()}-${Date.now()}`, displayName: `${form.firstName.trim()} ${form.lastName.trim()}`, favorite: false, color: avatarColors[contacts.length % avatarColors.length], tags: ["New"], location: form.location || "Add a location", birthday: "1990-01-01", updatedAt: new Date().toISOString(), note: form.note || "No notes yet." }; replaceContacts([contact, ...contacts]); dispatch({ type: "select", id: contact.id }); setDialogOpen(false); };
  const deleteContact = (id) => { const next = contacts.filter((contact) => contact.id !== id); replaceContacts(next); dispatch({ type: "select", id: next[0]?.id ?? null }); };

  return <main data-part="app-shell">
    <aside data-part="sidebar">
      <header data-part="brand"><span data-part="brand-mark"><span /></span><span><strong>orbit</strong><small>your people, in view</small></span></header>
      <nav data-part="navigation" aria-label="Contact views"><span data-part="nav-eyebrow">Library</span><NavButton icon="users" label="All contacts" count={contacts.length} active={view === "all"} onClick={() => setView("all")} /><NavButton icon="star" label="Favorites" count={favoritesCount} active={view === "favorites"} onClick={() => setView("favorites")} /><NavButton icon="clock" label="Recently added" active={view === "recent"} onClick={() => setView("recent")} /></nav>
      <section data-part="sidebar-footer"><span data-part="sync-indicator"><i aria-hidden="true" />Synced just now</span><button type="button" data-part="profile-button"><span data-part="profile-avatar">EP</span><span><strong>Emiliano</strong><small>Personal space</small></span><Icon name="more" size={15} /></button></section>
    </aside>
    <section data-part="workspace">
      <header data-part="topbar"><label data-part="search-field"><Icon name="search" size={18} /><input aria-label="Search contacts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your people..." /><kbd>⌘ K</kbd></label><button type="button" data-part="add-button" onClick={() => setDialogOpen(true)}><Icon name="plus" size={17} />Add contact</button></header>
      <section data-part="content">
        <header data-part="content-header"><span data-part="eyebrow">Your circle</span><h1>{view === "favorites" ? "Favorites" : view === "recent" ? "Recently added" : "All contacts"}</h1><p>{loading ? "Preparing your people..." : `${visibleContacts.length} people worth keeping close.`}</p></header>
        {loading ? <p data-part="loading">Loading your circle<span aria-hidden="true">···</span></p> : <ul data-part="contact-list">{visibleContacts.map((contact) => <ContactCard key={contact.id} contact={contact} selected={contact.id === selectedId} onSelect={(id) => dispatch({ type: "select", id })} />)}{visibleContacts.length === 0 ? <li data-part="empty-list"><Icon name="search" size={22} /><strong>No contacts found</strong><span>Try another search or add someone new.</span></li> : null}</ul>}
      </section>
      <ContactDetail contact={selectedContact} onDelete={deleteContact} />
    </section>
    <AddContactDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={createContact} />
  </main>;
}
