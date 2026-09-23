/**
 * @file src/components/ContactForm/_ContactForm.jsx
 * @description Modal form for creating or editing a contact.
 * Manages local form state: dynamic phone/email/social arrays,
 * group checkboxes, and favourite toggle.
 * Saves via dispatch SAVE_CONTACT; animated entrance/exit.
 */
import { useEffect, useState, useCallback } from "react";
import cssText from "./_ContactForm.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { useAppState, useAppDispatch } from "../../helpers/index.js";
import { newId } from "../../helpers/index.js";
import { Icon } from "../Icon/index.js";
import { Avatar } from "../Avatar/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/** Phone label options */
const PHONE_LABELS = ["mobile", "home", "work", "fax", "other"];

/** Email label options */
const EMAIL_LABELS = ["personal", "work", "school", "other"];

/** Social platform options */
const SOCIAL_PLATFORMS = ["twitter", "linkedin", "instagram", "github", "website", "other"];

/** Group options */
const GROUP_OPTIONS = [
  { id: "family",  label: "Family"  },
  { id: "friends", label: "Friends" },
  { id: "work",    label: "Work"    },
];

/**
 * Builds the initial form state from an existing contact or empty defaults.
 * @param {object|null} contact
 * @returns {object}
 */
function buildInitialState(contact) {
  if (!contact || contact === "new") {
    return {
      firstName: "",
      lastName: "",
      company: "",
      jobTitle: "",
      phones: [{ id: newId(), label: "mobile", value: "" }],
      emails: [{ id: newId(), label: "personal", value: "" }],
      address: { street: "", city: "", state: "", zip: "", country: "" },
      birthday: "",
      notes: "",
      social: [],
      groups: [],
      favorite: false,
    };
  }
  return {
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    company: contact.company ?? "",
    jobTitle: contact.jobTitle ?? "",
    phones: contact.phones?.length
      ? contact.phones
      : [{ id: newId(), label: "mobile", value: "" }],
    emails: contact.emails?.length
      ? contact.emails
      : [{ id: newId(), label: "personal", value: "" }],
    address: contact.address ?? { street: "", city: "", state: "", zip: "", country: "" },
    birthday: contact.birthday ?? "",
    notes: contact.notes ?? "",
    social: contact.social ?? [],
    groups: contact.groups ?? [],
    favorite: contact.favorite ?? false,
  };
}

/**
 * A labelled text input row for the form.
 * @param {{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }} props
 */
function FormField({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label data-part="form-field">
      <span data-part="field-label">{label}</span>
      <input
        data-part="field-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
    </label>
  );
}

/**
 * A row with a select (label/type) + text input.
 * @param {{ item: object, labelOptions: string[], onUpdate: Function, onRemove: Function, placeholder?: string }} props
 */
function DynamicRow({ item, labelOptions, onUpdate, onRemove, placeholder = "" }) {
  return (
    <div data-part="dynamic-row">
      <select
        data-part="row-select"
        value={item.label}
        onChange={(e) => onUpdate(item.id, "label", e.target.value)}
        aria-label="Type"
      >
        {labelOptions.map((l) => (
          <option key={l} value={l}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </option>
        ))}
      </select>
      <input
        data-part="row-input"
        type="text"
        value={item.value ?? item.handle ?? ""}
        onChange={(e) =>
          onUpdate(item.id, item.handle !== undefined ? "handle" : "value", e.target.value)
        }
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      <button
        data-part="row-remove"
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label="Remove"
      >
        <Icon name="x-mark" size={13} />
      </button>
    </div>
  );
}

/**
 * Modal contact form — create or edit.
 */
export function ContactForm() {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const { editingContact } = useAppState();
  const dispatch = useAppDispatch();

  const isNew = editingContact === "new";
  const [form, setForm] = useState(() => buildInitialState(editingContact));

  // Re-init if a different contact is opened for editing
  useEffect(() => {
    setForm(buildInitialState(editingContact));
  }, [editingContact]);

  /* ---- Helpers ---- */
  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setAddress = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  }, []);

  // Dynamic arrays
  const addPhone = () =>
    setForm((prev) => ({
      ...prev,
      phones: [...prev.phones, { id: newId(), label: "mobile", value: "" }],
    }));

  const updatePhone = (id, field, value) =>
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));

  const removePhone = (id) =>
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.filter((p) => p.id !== id),
    }));

  const addEmail = () =>
    setForm((prev) => ({
      ...prev,
      emails: [...prev.emails, { id: newId(), label: "personal", value: "" }],
    }));

  const updateEmail = (id, field, value) =>
    setForm((prev) => ({
      ...prev,
      emails: prev.emails.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));

  const removeEmail = (id) =>
    setForm((prev) => ({
      ...prev,
      emails: prev.emails.filter((e) => e.id !== id),
    }));

  const addSocial = () =>
    setForm((prev) => ({
      ...prev,
      social: [...prev.social, { id: newId(), platform: "twitter", handle: "" }],
    }));

  const updateSocial = (id, field, value) =>
    setForm((prev) => ({
      ...prev,
      social: prev.social.map((s) =>
        s.id === id ? { ...s, [field === "label" ? "platform" : field]: value } : s
      ),
    }));

  const removeSocial = (id) =>
    setForm((prev) => ({
      ...prev,
      social: prev.social.filter((s) => s.id !== id),
    }));

  const toggleGroup = (groupId) => {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter((g) => g !== groupId)
        : [...prev.groups, groupId],
    }));
  };

  /* ---- Submit ---- */
  function handleSubmit(e) {
    e.preventDefault();
    const id =
      isNew || !editingContact || editingContact === "new"
        ? `c-${Date.now()}`
        : editingContact.id;

    const contact = { ...form, id };
    // Strip empty phones/emails/social
    contact.phones = contact.phones.filter((p) => p.value.trim());
    contact.emails = contact.emails.filter((em) => em.value.trim());
    contact.social = contact.social.filter((s) => s.handle.trim());

    dispatch({ type: "SAVE_CONTACT", payload: contact });
  }

  function handleClose() {
    dispatch({ type: "CLOSE_FORM" });
  }

  const previewName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "New Contact";

  return (
    <div data-part="form-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <aside data-part="form-panel" role="dialog" aria-modal="true" aria-label={isNew ? "Add contact" : "Edit contact"}>
        {/* Header */}
        <header data-part="form-header">
          <button data-part="form-cancel" type="button" onClick={handleClose} aria-label="Cancel">
            Cancel
          </button>
          <h2 data-part="form-title">{isNew ? "New Contact" : "Edit Contact"}</h2>
          <button data-part="form-save" type="submit" form="contact-form" aria-label="Save contact">
            Done
          </button>
        </header>

        {/* Scrollable body */}
        <div data-part="form-body">
          {/* Avatar preview */}
          <div data-part="form-avatar-row">
            <Avatar firstName={form.firstName} lastName={form.lastName} size="lg" />
          </div>

          <form id="contact-form" data-part="form-content" onSubmit={handleSubmit}>
            {/* Name */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Name</h3>
              <div data-part="form-grid-2">
                <FormField
                  label="First name"
                  value={form.firstName}
                  onChange={(v) => setField("firstName", v)}
                  placeholder="First"
                />
                <FormField
                  label="Last name"
                  value={form.lastName}
                  onChange={(v) => setField("lastName", v)}
                  placeholder="Last"
                />
              </div>
            </section>

            {/* Company */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Company</h3>
              <FormField
                label="Company"
                value={form.company}
                onChange={(v) => setField("company", v)}
                placeholder="Company name"
              />
              <FormField
                label="Job title"
                value={form.jobTitle}
                onChange={(v) => setField("jobTitle", v)}
                placeholder="Title"
              />
            </section>

            {/* Phone */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Phone</h3>
              {form.phones.map((p) => (
                <DynamicRow
                  key={p.id}
                  item={p}
                  labelOptions={PHONE_LABELS}
                  onUpdate={updatePhone}
                  onRemove={removePhone}
                  placeholder="+1 (555) 000-0000"
                />
              ))}
              <button
                data-part="add-row-btn"
                type="button"
                onClick={addPhone}
              >
                <Icon name="plus" size={13} />
                Add phone
              </button>
            </section>

            {/* Email */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Email</h3>
              {form.emails.map((e) => (
                <DynamicRow
                  key={e.id}
                  item={e}
                  labelOptions={EMAIL_LABELS}
                  onUpdate={updateEmail}
                  onRemove={removeEmail}
                  placeholder="email@example.com"
                />
              ))}
              <button
                data-part="add-row-btn"
                type="button"
                onClick={addEmail}
              >
                <Icon name="plus" size={13} />
                Add email
              </button>
            </section>

            {/* Address */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Address</h3>
              <FormField
                label="Street"
                value={form.address.street}
                onChange={(v) => setAddress("street", v)}
                placeholder="Street address"
              />
              <div data-part="form-grid-3">
                <FormField
                  label="City"
                  value={form.address.city}
                  onChange={(v) => setAddress("city", v)}
                  placeholder="City"
                />
                <FormField
                  label="State"
                  value={form.address.state}
                  onChange={(v) => setAddress("state", v)}
                  placeholder="State"
                />
                <FormField
                  label="ZIP"
                  value={form.address.zip}
                  onChange={(v) => setAddress("zip", v)}
                  placeholder="ZIP"
                />
              </div>
              <FormField
                label="Country"
                value={form.address.country}
                onChange={(v) => setAddress("country", v)}
                placeholder="Country"
              />
            </section>

            {/* Birthday */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Birthday</h3>
              <FormField
                label="Date"
                value={form.birthday}
                onChange={(v) => setField("birthday", v)}
                type="date"
              />
            </section>

            {/* Notes */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Notes</h3>
              <label data-part="form-field">
                <span data-part="field-label">Note</span>
                <textarea
                  data-part="field-textarea"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                />
              </label>
            </section>

            {/* Social */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Social</h3>
              {form.social.map((s) => (
                <DynamicRow
                  key={s.id}
                  item={{ ...s, label: s.platform }}
                  labelOptions={SOCIAL_PLATFORMS}
                  onUpdate={updateSocial}
                  onRemove={removeSocial}
                  placeholder="@handle or URL"
                />
              ))}
              <button
                data-part="add-row-btn"
                type="button"
                onClick={addSocial}
              >
                <Icon name="plus" size={13} />
                Add social
              </button>
            </section>

            {/* Groups */}
            <section data-part="form-section">
              <h3 data-part="form-section-title">Groups</h3>
              <div data-part="group-pills">
                {GROUP_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    data-part="group-pill"
                    data-active={form.groups.includes(id) ? "" : undefined}
                    onClick={() => toggleGroup(id)}
                    aria-pressed={form.groups.includes(id)}
                  >
                    {form.groups.includes(id) && <Icon name="check" size={12} />}
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Favourite */}
            <section data-part="form-section">
              <button
                type="button"
                data-part="fav-toggle"
                data-active={form.favorite ? "" : undefined}
                onClick={() => setField("favorite", !form.favorite)}
                aria-pressed={form.favorite}
              >
                <Icon name="star" size={16} filled={form.favorite} />
                <span>{form.favorite ? "Remove from Favourites" : "Add to Favourites"}</span>
              </button>
            </section>
          </form>
        </div>
      </aside>
    </div>
  );
}
