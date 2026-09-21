// Template Engine - DOM node path helpers for template descriptors

export function getNodePath(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const p = cur.parentNode;
    if (!p) break;
    let i = 0;
    let c = cur;
    while (c.previousSibling) {
      c = c.previousSibling;
      i++;
    }
    path.unshift(i);
    cur = p;
  }
  return path;
}

export function resolveNodePath(root, path) {
  let cur = root;
  for (const i of path) cur = cur.childNodes[i];
  return cur;
}
