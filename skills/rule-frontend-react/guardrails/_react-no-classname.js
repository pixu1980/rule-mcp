/** Guardrail `react-no-classname`: No className, use data-part. */
export const reactNoClassname = {
  id: "react-no-classname",
  label: "No className, use data-part",
  description: "React components must use data-part instead of className for styling hooks.",
  check: (code) => {
    const cn = code.match(/className=/g);

    return {
      pass: !cn,
      failCount: cn?.length || 0,
      detail: cn || [],
      suggestion: 'Replace className="..." with data-part="..." attributes. CSS uses [data-part="..."] selectors instead of .class selectors.',
    };
  },
};
