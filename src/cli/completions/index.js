

import { generateBash } from "./_bash.js";
import { generateFish } from "./_fish.js";
import { generateZsh } from "./_zsh.js";

/**
 * @module cli/completions
 *
 * Shell auto-completion for pix-galaxy-mcp.
 * Generates completion scripts for zsh, bash, and fish.
 *
 * Usage:
 *   pix-galaxy-mcp completions          → prints zsh completion (auto-detected)
 *   pix-galaxy-mcp completions --shell zsh
 *   pix-galaxy-mcp completions --shell bash
 *   pix-galaxy-mcp completions --shell fish
 *
 * Install:
 *   pix-galaxy-mcp completions --shell zsh > ~/.zsh/completions/_pix-galaxy-mcp
 *   pix-galaxy-mcp completions --shell bash | source   # or add to .bashrc
 *   pix-galaxy-mcp completions --shell fish > ~/.config/fish/completions/pix-galaxy-mcp.fish
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
