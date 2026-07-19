// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — PropertyPart
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { Part } from "./_part.js";
import { isSignalLike } from "../signals/index.js";

export class PropertyPart extends Part {
  constructor(el, name) {
    super();

    this.element = el;

    this.name = name;
  }

  setValue(value) {
    if (isSignalLike(value)) {
      this.bindSignal(value, (r) => {
        this.commit(r);
      });

      return;
    }

    this.disposeSignal();
    this.commit(value);
  }

  commit(value) {
    this.element[this.name] = value;
  }

}
