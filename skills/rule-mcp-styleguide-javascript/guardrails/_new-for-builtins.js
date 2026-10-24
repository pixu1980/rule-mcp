

/** Guardrail `js-new-for-builtins`: new required for Map/Set/Date/Array/WeakMap/WeakSet */

export const jsNewForBuiltins = {
  id: "js-new-for-builtins",
  label: "new required for Map/Set/Date/Array/WeakMap/WeakSet",
  description:
    "Builtin constructors Map, Set, Date, Array, WeakMap, WeakSet must be called with new. Calling them as functions (const m = Map()) is forbidden. String, Number, Boolean, Symbol, BigInt are exempt.",
  check: (code, { helpers: { countedVerdict } }) => {
    const violations = [];

    for (const name of ["Map", "Set", "Date", "Array", "WeakMap", "WeakSet"]) {
      const re = new RegExp(String.raw`(?:=|:)\s*${name}\s*\(`, "g");
      let m;

      while ((m = re.exec(code)) !== null) {
        violations.push(m[0].trim());
      }
    }

    if (violations.length === 0) {
      return { pass: true, note: "No bare builtin constructor calls found" };
    }

    return countedVerdict(violations, { suggestion: "Use new with builtin constructors: const cache = new Map();" });
  },
};
