// Template Engine - DOM walk (node / attributes / children / directive dispatch)

export const walkMethods = {
  processNode(node, data) {
    if (!node) return;

    if (node.nodeType === node.TEXT_NODE) {
      const frag = this.processTextSegments(node, data);
      if (frag && node.parentNode) {
        node.parentNode.insertBefore(frag, node);
        node.remove();
      }
      return;
    }

    this.processAttributes(node, data);

    if (node.nodeType === node.ELEMENT_NODE) {
      if (this.handleElementDirectives(node, data)) return;
    }

    this.iterateChildren(node, data);
  },

  processAttributes(node, data) {
    if (!node.attributes) return;
    for (const attr of Array.from(node.attributes)) {
      attr.value = this.processText(attr.value, data);
    }
  },

  handleElementDirectives(node, data) {
    const tag = node.tagName?.toLowerCase();
    if (!tag) return false;
    if (tag === "if") {
      this.processIfElement(node, data);
      return true;
    }
    if (tag === "switch") {
      this.processSwitchElement(node, data);
      return true;
    }
    if (tag === "md" || tag === "markdown") {
      this.processMdElement(node, data);
      return true;
    }
    if (tag === "include") {
      this.processIncludeElement(node, data);
      return true;
    }
    return false;
  },

  iterateChildren(node, data) {
    const children = Array.from(node.childNodes ?? []);
    for (const child of children) {
      if (child.nodeType === child.ELEMENT_NODE && child.tagName.toLowerCase() === "for") {
        this.processForElement(child, data);
      } else {
        this.processNode(child, data);
      }
    }
  },
};
