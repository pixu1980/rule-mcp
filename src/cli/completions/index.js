

import { generateBash } from "./_bash.js";
import { generateFish } from "./_fish.js";
import { generateZsh } from "./_zsh.js";

/**
 * @module cli/completions
 *
 * Shell auto-completion for rule-mcp.
 * Generates completion scripts for zsh, bash, and fish.
 *
 * Usage:
 *   rule-mcp completions          → prints zsh completion (auto-detected)
 *   rule-mcp completions --shell zsh
 *   rule-mcp completions --shell bash
 *   rule-mcp completions --shell fish
 *
 * Install:
 *   rule-mcp completions --shell zsh > ~/.zsh/completions/_rule-mcp
 *   rule-mcp completions --shell bash | source   # or add to .bashrc
 *   rule-mcp completions --shell fish > ~/.config/fish/completions/rule-mcp.fish
 */

export function generateCompletions(shell = "zsh") {
  switch (shell) {
    case "bash": {
      return generateBash();
    }
    case "fish": {
      return generateFish();
    }
    case "zsh":
    default: {
      return generateZsh();
    }
  }
}
