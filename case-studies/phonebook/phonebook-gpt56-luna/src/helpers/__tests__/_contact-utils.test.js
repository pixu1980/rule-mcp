/**
 * Behavioral tests for contact search, filtering, and presentation helpers.
 */
import { describe, expect, it } from "vitest";
import { getInitials, getVisibleContacts, normalizeContact } from "../_contact-utils.js";

const contacts = [
  { id: "1", firstName: "Maya", lastName: "Chen", company: "Northstar", favorite: true, updatedAt: "2026-06-18" },
  {
    id: "2",
    firstName: "Luca",
    lastName: "Bianchi",
    company: "Sonder Studio",
    favorite: false,
    updatedAt: "2026-06-10",
  },
  { id: "3", firstName: "Ana", lastName: "Silva", company: "Atelier 9", favorite: true, updatedAt: "2026-05-22" },
];

describe("contact helpers", () => {
  it("normalizes a contact into a stable searchable record", () => {
    expect(normalizeContact({ firstName: "  Ada ", lastName: "Lovelace" })).toMatchObject({
      displayName: "Ada Lovelace",
      searchable: "ada lovelace",
    });
  });

  it("filters by query and favorite view without mutating source data", () => {
    const result = getVisibleContacts(contacts, { query: "studio", view: "all" });
    expect(result.map((contact) => contact.id)).toEqual(["2"]);
    expect(contacts).toHaveLength(3);
    expect(getVisibleContacts(contacts, { query: "", view: "favorites" }).map((contact) => contact.id)).toEqual([
      "3",
      "1",
    ]);
  });

  it("shows the most recently updated contacts in recent view", () => {
    expect(getVisibleContacts(contacts, { view: "recent" }).map((contact) => contact.id)).toEqual(["1", "2", "3"]);
  });

  it("returns a two-letter fallback for contact avatars", () => {
    expect(getInitials({ firstName: "Maya", lastName: "Chen" })).toBe("MC");
    expect(getInitials({ firstName: "  ", lastName: "" })).toBe("??");
  });
});
