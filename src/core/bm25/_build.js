/** Index construction over the skills catalog. */

import { getSkillsDirs as getSkillsDirectories } from "../../cli/paths.js";
import { getSkillNames, readSkill } from "../../tools/router/index.js";
import { skillCache } from "../skills/_skills.js";
import { tokenize } from "./_terms.js";
import { extractSections, HEADING_BOOST } from "./_extract.js";
import { _index, setIndex } from "./_state.js";
import { persistIndex, restoreIndex } from "./_cache.js";

export function buildIndex(force = false) {
  if (_index && !force) {
    return;
  }

  // Tokenizing every skill costs ~95ms and produces the same index every time
  // the code and the skills are unchanged. Reading it back costs ~3ms, and a
  // stdio server pays the build once while a CLI invocation and every hook pay
  // it again (PERF-2).
  if (!force && restoreIndex()) {
    return;
  }

  const skillNames = getSkillNames();
  const df = new Map(); // term → docId → freq
  const documentLength = new Map();
  const docs = [];
  let documentId = 0;

  for (const skillName of skillNames) {
    // The hub skill ("rule") is the router's own directory, not a body of
    // knowledge: indexed, its near-ubiquitous vocabulary dilutes the
    // document frequency of every common term and drags the whole routing
    // surface down with it.
    if (skillName === "rule") {
      continue;
    }

    const content = readSkill(skillName);

    if (!content) {
      continue;
    }

    const sections = extractSections(content);

    for (const section of sections) {
      if (!section.text.trim()) {
        continue;
      }

      // The heading is the routing surface: a term appearing only in a heading
      // would otherwise score zero. Counting it HEADING_BOOST times is the
      // single-field way to weight a field, and docLength counts them too so
      // BM25 normalization stays honest.
      const terms = tokenize(section.text);
      const headingTerms = tokenize(section.heading);
      const termFreq = new Map();

      for (const term of terms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }

      for (const term of headingTerms) {
        termFreq.set(term, (termFreq.get(term) || 0) + HEADING_BOOST);
      }

      // Store document
      const id = documentId++;
      docs.push({
        id,
        skill: skillName,
        section: section.heading,
        text: section.text,
        snippet: section.text.replaceAll(/\s+/g, " ").slice(0, 200).trim(),
      });

      documentLength.set(id, terms.length + headingTerms.length * HEADING_BOOST);

      // Update inverted index
      for (const [term, freq] of termFreq) {
        if (!df.has(term)) {
          df.set(term, new Map());
        }

        df.get(term).set(id, freq);
      }
    }
  }

  const totalDocs = docs.length;
  const avgDocumentLength = totalDocs > 0 ? [...documentLength.values()].reduce((a, b) => a + b, 0) / totalDocs : 0;

  setIndex({ df, docLength: documentLength, docs, totalDocs, avgDocLength: avgDocumentLength });
  void skillCache; // loaded for its side effects (module graph order)
  persistIndex();
}

/**
 * The key a stored index is filed under: this code, these skills.
 *
 * @returns {string} 12 hex characters
 */
