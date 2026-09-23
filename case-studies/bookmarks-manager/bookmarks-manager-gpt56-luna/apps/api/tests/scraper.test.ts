import { describe, expect, it } from "vitest";
import {
  extractMetadataFromHtml,
  isPublicHttpUrl,
} from "../src/modules/scrape/scraper.service.js";

describe("scraper service", () => {
  it("extracts open graph metadata and a readable text preview", () => {
    const html = `
      <html><head>
        <title>Fallback title</title>
        <meta property="og:title" content="The Quiet Atlas" />
        <meta property="og:description" content="A field guide for slow travel." />
        <meta property="og:image" content="https://images.example.com/atlas.jpg" />
      </head><body>
        <nav>Navigation noise</nav>
        <main><h1>The Quiet Atlas</h1><p>Walk slowly. Notice more. This is the body preview.</p></main>
        <footer>Footer noise</footer>
      </body></html>`;

    expect(extractMetadataFromHtml(html, "https://example.com/story")).toEqual({
      title: "The Quiet Atlas",
      description: "A field guide for slow travel.",
      image: "https://images.example.com/atlas.jpg",
      domain: "example.com",
      preview: "Walk slowly. Notice more. This is the body preview.",
    });
  });

  it("allows public HTTP URLs and rejects local network targets", () => {
    expect(isPublicHttpUrl("https://example.com/bookmark")).toBe(true);
    expect(isPublicHttpUrl("http://localhost:3000/secret")).toBe(false);
    expect(isPublicHttpUrl("http://[::1]/secret")).toBe(false);
    expect(isPublicHttpUrl("http://[fc00::1]/secret")).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false);
  });
});
