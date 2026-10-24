/** Guardrail `react-hooks-rules`: React Hooks rules. */
export const reactHooksRules = {
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
};
