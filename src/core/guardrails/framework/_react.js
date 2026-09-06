/** React guardrail family. */
export const REACT_GUARDRAILS = [
  {
    id: "react-no-classname",
    label: "No className, use data-part",
    description: "React components must use data-part instead of className for styling hooks.",
    check: (code) => {
      const cn = code.match(/className=/g);

      return {
        pass: !cn,
        failCount: cn?.length || 0,
        detail: cn || [],
        suggestion:
          'Replace className="..." with data-part="..." attributes. CSS uses [data-part="..."] selectors instead of .class selectors.',
      };
    },
  },
  {
    id: "react-hooks-rules",
    label: "React Hooks rules",
    description: "Hooks must be called at top level, not inside conditions, loops, or callbacks.",
    check: (code) => {
      const hooks = code.match(
        /\b(useState|useEffect|useMemo|useCallback|useRef|useReducer|useContext|useImperativeHandle|useLayoutEffect|useDebugValue|useTransition|useDeferredValue|useId|useSyncExternalStore|useInsertionEffect)\(/g,
      );

      if (!hooks) {
        return { pass: true, note: "No hooks found" };
      }

      const conditionalHooks = code.match(/if\s*\(.*\)\s*\{[^}]*\b(useState|useEffect|useMemo)\(/g);

      return {
        pass: !conditionalHooks,
        failCount: conditionalHooks?.length || 0,
        suggestion: "Move hooks to top level of the component function.",
      };
    },
  },
];
