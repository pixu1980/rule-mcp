

// ═══════════════════════════════════════════════════════════════════════════════
//  Block spacing fixer - deterministic blank-line enforcement
//  ═══════════════════════════════════════════════════════════════════════════════
//  Rules:
//    Case 1 - block at START of parent -> blank line BELOW only
//    Case 2 - block at END of parent   -> blank line ABOVE only
//    Case 3 - block in middle          -> blank line ABOVE AND BELOW
//
//  A "block" is any {...} containing >=2 lines of code.
//  Runs after Prettier so indentation is canonical.
//  ═══════════════════════════════════════════════════════════════════════════════

export * from "./_detect.js";
export * from "./_fix.js";
