import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewPanel } from "../src/components/PreviewPanel";

describe("bookmark preview", () => {
  it("shows the fetched Open Graph image with useful alternative text", () => {
    render(
      <PreviewPanel
        preview={{
          url: "https://example.com/story",
          title: "A story",
          description: "A description",
          image: "https://example.com/story.jpg",
          domain: "example.com",
          preview: "Readable text",
        }}
        isSaving={false}
        onSave={async () => undefined}
        onDismiss={() => undefined}
      />,
    );
    expect(screen.getByRole("img", { name: "A story cover" })).toHaveAttribute(
      "src",
      "https://example.com/story.jpg",
    );
  });
});
