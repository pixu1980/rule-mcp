/** Vue guardrail family. */
export const VUE_GUARDRAILS = [
  {
    id: "vue-no-class-binding",
    label: "No :class or v-bind:class",
    description: "Vue templates must use data-part instead of :class bindings.",
    check: (code) => {
      const classBindings = code.match(/:class\s*=|v-bind:class\s*=/g);

      return {
        pass: !classBindings,
        failCount: classBindings?.length || 0,
        suggestion: 'Replace :class with :data-part="..." bindings.',
      };
    },
  },
];
