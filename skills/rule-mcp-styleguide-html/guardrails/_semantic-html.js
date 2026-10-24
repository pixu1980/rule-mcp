

/** Guardrail `semantic-html`: Semantic HTML mandatory */
export const semanticHtml = {
  id: "semantic-html",
  label: "Semantic HTML mandatory",
  description: "No <div> where <section>, <article>, <header>, <footer>, <nav>, <main>, <aside>, <form>, <ul>, <ol>, <li>, <search> exists.",
  check: (code) => {
    const nonSemanticDivPatterns = [
      /<div[^>]*data-part="(header|footer|body|modal|content|nav|search|form|tabs|card|summary|stats|list|item|sidebar|banner|main)"/gi,
      /<div[^>]*class="[^"]*(header|footer|nav|sidebar|main|content|list|card)[^"]*"/gi,
      /<div[^>]*role="(banner|contentinfo|navigation|main|complementary|form|search|tablist|list|listitem)"/gi,
    ];
    const violations = [];

    for (const re of nonSemanticDivPatterns) {
      const m = code.match(re);

      if (m) {
        violations.push(...m);
      }
    }

    if (violations.length === 0) {
      return { pass: true, note: "No semantic-violating <div> found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: violations.slice(0, 10),
      suggestion:
        'Replace <div data-part="header|footer|..."> with the matching semantic element. Use: <header>, <footer>, <section>, <article>, <nav>, <search>, <form>, <ul>, <ol>, <main>, <aside>.',
    };
  },
};
