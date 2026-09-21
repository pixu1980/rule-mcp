// Template Engine - getTemplate (cache + markup + descriptors)

import { buildTemplateMarkup } from "./_template-markup.js";
import { collectTemplateDescriptors } from "./_template-descriptors.js";

const templateCache = new WeakMap();

export function getTemplate(strings) {
  let rec = templateCache.get(strings);
  if (rec) return rec;

  const meta = buildTemplateMarkup(strings);

  // Step 4: Parse into DOM template and walk
  const template = document.createElement("template");
  template.innerHTML = meta.processed;

  const { descriptors, exprCount } = collectTemplateDescriptors(template.content, meta);

  rec = { template, descriptors, exprCount };
  templateCache.set(strings, rec);
  return rec;
}
