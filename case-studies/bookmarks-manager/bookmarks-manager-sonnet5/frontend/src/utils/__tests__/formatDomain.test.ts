/**
 * @module utils/__tests__/formatDomain.test
 */

import { describe, expect, it } from "vitest";
import { formatDomain } from "../formatDomain";

describe("formatDomain", () => {
  it("strips the www. prefix", () => {
    expect(formatDomain("https://www.example.com/path")).toBe("example.com");
  });

  it("returns the bare hostname for URLs without www.", () => {
    expect(formatDomain("https://blog.example.org/post/1")).toBe("blog.example.org");
  });

  it("falls back to the raw input when the URL cannot be parsed", () => {
    expect(formatDomain("not-a-url")).toBe("not-a-url");
  });
});
