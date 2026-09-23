/** HTTP contract tests for health, pagination, and structured validation errors. */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("HTTP API", () => {
  it("returns a health signal", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("returns paginated bookmarks with a total header", async () => {
    const response = await request(app).get(
      "/api/v1/bookmarks?offset=0&limit=1",
    );
    expect(response.status).toBe(200);
    expect(response.headers["x-total-count"]).toBe("1");
    expect(response.body).toHaveLength(1);
  });

  it("allows localhost and loopback origins during local development", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://127.0.0.1:5173");
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("rejects non-JSON or invalid bookmark payloads with a correlation id", async () => {
    const response = await request(app)
      .post("/api/v1/bookmarks/preview")
      .send({ url: "localhost" });
    expect(response.status).toBe(400);
    expect(response.body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(response.body["correlation-id"]).toBeTypeOf("string");
  });
});
