// Template Engine - TemplateInstance + getTemplate (barrel)
// Resolution and lifecycle live in sibling modules; this file wires the circular dep.

import { _setTemplateInstance } from "./_child-node-part.js";
import { getTemplate } from "./_get-template.js";
import { TemplateInstance } from "./_instance.js";

export { getTemplate, TemplateInstance };

// Resolve circular dep: register TemplateInstance with ChildNodePart
_setTemplateInstance(TemplateInstance);
