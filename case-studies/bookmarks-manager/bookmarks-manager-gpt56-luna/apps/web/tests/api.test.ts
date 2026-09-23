import { describe, expect, it } from "vitest";
import {
  bookmarkResponseSchema,
  buildBookmarkPayload,
} from "../src/services/api";

describe("bookmark API contract", () => {
  it("normalizes a pasted URL into the create payload", () => {
    expect(buildBookmarkPayload("  https://example.com/read  ")).toEqual({
      url: "https://example.com/read",
    });
  });

  it("validates a bookmark response before rendering", () => {
    expect(
      bookmarkResponseSchema.parse({
        id: "bookmark-1",
        url: "https://example.com/read",
        title: "A story",
        description: "A description",
        image: null,
        domain: "example.com",
        preview: "Readable preview",
        createdAt: "2026-07-11T12:00:00.000Z",
      }).title,
    ).toBe("A story");
  });
});
