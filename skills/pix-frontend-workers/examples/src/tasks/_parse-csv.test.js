/**
 * @module tasks/parse-csv.test
 *
 * Task modules are tested on the main thread, with no worker and no DOM shim.
 * That is the payoff of keeping tasks pure: worker plumbing is tested once, in
 * an integration test; task logic is tested here, fast.
 */

import { describe, it, expect } from "vitest";
import { parseCsv } from "./_parse-csv.js";
import { grayscale } from "./_grayscale.js";

describe("parseCsv", () => {
  it("maps rows onto the header line", () => {
    const rows = parseCsv({ text: "id,name\n1,Ada\n2,Grace\n" });

    expect(rows).toEqual([
      { id: "1", name: "Ada" },
      { id: "2", name: "Grace" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv({ text: "   \n\n" })).toEqual([]);
  });

  it("fills missing trailing cells with empty strings", () => {
    const rows = parseCsv({ text: "a,b,c\n1,2" });

    expect(rows).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});

describe("grayscale", () => {
  it("flattens RGB channels to a single luminance value", () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
    const { result, transfer } = grayscale(pixels.buffer);
    const output = new Uint8ClampedArray(result);

    expect(output[0]).toBe(output[1]);
    expect(output[1]).toBe(output[2]);
    expect(output[3]).toBe(255);
    expect(transfer).toEqual([result]);
  });

  it("rejects buffers that are not RGBA", () => {
    expect(() => grayscale(new ArrayBuffer(5))).toThrow(/divisible by 4/);
  });
});
