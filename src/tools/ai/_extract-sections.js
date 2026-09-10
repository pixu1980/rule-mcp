

/**
 * Extract `## Section` headings from SKILL.md content.
 * Strips YAML frontmatter so metadata keywords don't pollute scoring.
 */
export function extractSections(content) {
  let body = content;
  const fmMatch = body.match(/^---\s*\n[\s\S]*?\n---\s*\n/);

  if (fmMatch) {
    body = body.slice(fmMatch[0].length);
  }

  const lines = body.split("\n");
  const sections = [];
  let currentHeading = "Overview";
  let currentContent = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = h2Match ? null : line.match(/^###\s+(.+)/);

    if (h2Match) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n") });
      }

      currentHeading = h2Match[1].trim();
      currentContent = [];
    } else if (h3Match) {
      // Treat ### as a separate section for better granularity
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n") });
      }

      currentHeading = h3Match[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n") });
  }

  return sections;
}
