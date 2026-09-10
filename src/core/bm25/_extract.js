

/** Document section extraction with heading boost. */

function extractSections(content) {
  const lines = content.split("\n");
  const sections = [];
  let currentHeading = "";
  let currentLines = [];

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);

    if (m) {
      if (currentHeading && currentLines.length > 0) {
        sections.push({ heading: currentHeading, text: currentLines.join("\n") });
      }

      currentHeading = m[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading && currentLines.length > 0) {
    sections.push({ heading: currentHeading, text: currentLines.join("\n") });
  }

  return sections;
}

/** Weight of a term that appears in a section heading. */
const HEADING_BOOST = 3;

export { extractSections, HEADING_BOOST };
