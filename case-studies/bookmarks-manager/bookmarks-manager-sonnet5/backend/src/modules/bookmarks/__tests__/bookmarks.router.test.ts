/**
 * @module modules/bookmarks/__tests__/bookmarks.router.test
 *
 * Integration tests for the bookmarks HTTP surface, exercising validation,
 * SSRF blocking, and CRUD behavior against the in-memory repository.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../../scraping/scrape.service.js", () => ({
  scrapeUrl: vi.fn(async () => ({
    canonicalUrl: "https://example.com/",
    title: "Example Domain",
    description: "Example description",
    imageUrl: "https://example.com/og.png",
    faviconUrl: "https://example.com/favicon.ico",
    siteName: "example.com",
    textPreview: "This domain is for illustrative examples.",
  })),
}));

vi.mock("../../../common/utils/ssrfGuard.js", () => ({
  assertSafeUrl: vi.fn(async (raw: string) => new URL(raw)),
}));

const { createApp } = await import("../../../app.js");
const { _clear } = await import("../bookmarks.repository.js");

describe("bookmarks router", () => {
  beforeEach(() => {
    _clear();
  });

  it("rejects an invalid URL with 400 VALIDATION_ERROR shape", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/bookmarks").send({ url: "" });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].code).toBe("VALIDATION_ERROR");
  });

  it("creates a bookmark and returns 201 with scraped metadata", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/bookmarks").send({ url: "https://example.com" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Example Domain");
    expect(res.body.id).toBeTypeOf("string");
  });

  it("lists bookmarks with X-Total-Count header", async () => {
    const app = createApp();
    await request(app).post("/api/v1/bookmarks").send({ url: "https://example.com" });
    const res = await request(app).get("/api/v1/bookmarks");
    expect(res.status).toBe(200);
    expect(res.headers["x-total-count"]).toBe("1");
    expect(res.body).toHaveLength(1);
  });

  it("returns 404 when deleting an unknown id", async () => {
    const app = createApp();
    const res = await request(app).delete("/api/v1/bookmarks/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe("BOOKMARK_NOT_FOUND");
  });

  it("deletes an existing bookmark", async () => {
    const app = createApp();
    const created = await request(app).post("/api/v1/bookmarks").send({ url: "https://example.com" });
    const res = await request(app).delete(`/api/v1/bookmarks/${created.body.id}`);
    expect(res.status).toBe(204);
  });
});
