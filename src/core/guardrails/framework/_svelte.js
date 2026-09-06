/** Svelte guardrail family. */
export const SVELTE_GUARDRAILS = [
  {
    id: "svelte-no-class-directive",
    label: "No class: directives",
    description: "Svelte should use data-part attributes, not class:name directives.",
    check: (code) => {
      const n = code.match(/class:\w+/g);

      return {
        pass: !n,
        failCount: n?.length || 0,
        suggestion: 'Replace class:name with data-part="..." or data-state-* attributes.',
      };
    },
  },
];
