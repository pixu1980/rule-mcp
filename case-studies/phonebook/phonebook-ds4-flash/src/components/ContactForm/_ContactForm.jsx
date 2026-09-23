/**
 * FILE: _ContactForm.jsx
 * USAGE: Contact form for creating and editing contacts with validation.
 */
import React, { useEffect, useRef, useState } from "react";

import cssText from "./_ContactForm.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const CATEGORIES = [
  { id: "friends", label: "Amici" },
  { id: "family", label: "Famiglia" },
  { id: "work", label: "Lavoro" },
];

const AVATAR_COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF2D55", "#5856D6", "#AF52DE", "#FFCC00", "#30D158", "#64D2FF", "#BF5AF2"];

/**
 * @param {{ contact: object | null, onSave: (data: object) => void, onCancel: () => void }} props
 */
export function ContactForm({ contact, onSave, onCancel }) {
  const ref = useRef(null);
  const isEditing = !!contact;

  const [form, setForm] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    phone: contact?.phone || "",
    email: contact?.email || "",
    address: contact?.address || "",
    category: contact?.category || "friends",
    avatarColor: contact?.avatarColor || AVATAR_COLORS[0],
    notes: contact?.notes || "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  /**
   * Validate form fields.
   * @returns {boolean}
   */
  function validate() {
    const newErrors = {};
    if (!form.firstName.trim()) {
      newErrors.firstName = "Il nome è obbligatorio";
    }
    if (!form.lastName.trim()) {
      newErrors.lastName = "Il cognome è obbligatorio";
    }
    if (!form.phone.trim()) {
      newErrors.phone = "Il telefono è obbligatorio";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email non valida";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /**
   * Handle form submission.
   * @param {Event} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, id: contact?.id || null });
  }

  /**
   * Update a single form field.
   * @param {string} field
   * @param {string} value
   */
  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  const title = isEditing ? "Modifica contatto" : "Nuovo contatto";

  return (
    <article ref={ref} data-part="form-container">
      <header data-part="form-header">
        <button data-part="form-back" onClick={onCancel} aria-label="Torna indietro">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 data-part="form-title">{title}</h2>
      </header>

      <form data-part="form" onSubmit={handleSubmit} noValidate>
        <section data-part="form-section">
          <p data-part="section-label">Informazioni</p>

          <label data-part="form-field">
            <span data-part="field-label">Nome *</span>
            <input
              data-part="input"
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="Mario"
              aria-invalid={errors.firstName ? "true" : undefined}
            />
            {errors.firstName && <span data-part="field-error">{errors.firstName}</span>}
          </label>

          <label data-part="form-field">
            <span data-part="field-label">Cognome *</span>
            <input
              data-part="input"
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Rossi"
              aria-invalid={errors.lastName ? "true" : undefined}
            />
            {errors.lastName && <span data-part="field-error">{errors.lastName}</span>}
          </label>
        </section>

        <section data-part="form-section">
          <p data-part="section-label">Contatto</p>

          <label data-part="form-field">
            <span data-part="field-label">Telefono *</span>
            <input
              data-part="input"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+39 345 678 9012"
              aria-invalid={errors.phone ? "true" : undefined}
            />
            {errors.phone && <span data-part="field-error">{errors.phone}</span>}
          </label>

          <label data-part="form-field">
            <span data-part="field-label">Email</span>
            <input
              data-part="input"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="mario.rossi@example.com"
              aria-invalid={errors.email ? "true" : undefined}
            />
            {errors.email && <span data-part="field-error">{errors.email}</span>}
          </label>

          <label data-part="form-field">
            <span data-part="field-label">Indirizzo</span>
            <input
              data-part="input"
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Via Roma 42, Milano"
            />
          </label>
        </section>

        <section data-part="form-section">
          <p data-part="section-label">Categoria</p>
          <nav data-part="category-picker">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                data-part="category-option"
                data-selected={form.category === cat.id ? "" : null}
                onClick={() => updateField("category", cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </nav>
        </section>

        <section data-part="form-section">
          <p data-part="section-label">Colore avatar</p>
          <nav data-part="color-picker">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                data-part="color-swatch"
                data-selected={form.avatarColor === color ? "" : null}
                style={{ backgroundColor: color }}
                onClick={() => updateField("avatarColor", color)}
                aria-label={`Colore ${color}`}
              />
            ))}
          </nav>
        </section>

        <section data-part="form-section">
          <p data-part="section-label">Note</p>
          <label data-part="form-field">
            <textarea
              data-part="textarea"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Note aggiuntive…"
              rows={3}
            />
          </label>
        </section>

        <footer data-part="form-footer">
          <button type="button" data-part="form-cancel" onClick={onCancel}>
            Annulla
          </button>
          <button type="submit" data-part="form-submit">
            {isEditing ? "Salva modifiche" : "Aggiungi contatto"}
          </button>
        </footer>
      </form>
    </article>
  );
}
