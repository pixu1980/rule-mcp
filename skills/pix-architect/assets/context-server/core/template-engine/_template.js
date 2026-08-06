// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3d — render() function
// ═══════════════════════════════════════════════════════════════════════════════

import { ChildNodePart } from "./_child-node-part.js";

export function render(result, container) {
  let rootPart = container.__rootPart;
  if (!rootPart) {
    const s = document.createComment("root:start");
    const e = document.createComment("root:end");
    container.textContent = "";
    container.append(s, e);
    rootPart = new ChildNodePart(s, e);
    container.__rootPart = rootPart;
  }
  rootPart.setValue(result);
}
