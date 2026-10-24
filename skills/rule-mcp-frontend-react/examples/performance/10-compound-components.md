# Example 10 - Compound Components Instead of Prop Soup

## Problem

```tsx
<Accordion items={items} renderHeader={renderHeader} renderBody={renderBody} icon="chevron" iconPosition="right" allowMultiple={false} onToggle={handleToggle} />
```

This API is flexible at first, but every new requirement adds more props.

## Refactor API

```tsx
<Accordion>
  <Accordion.Item value="billing">
    <Accordion.Header>Billing</Accordion.Header>
    <Accordion.Body>Billing details...</Accordion.Body>
  </Accordion.Item>

  <Accordion.Item value="security">
    <Accordion.Header>Security</Accordion.Header>
    <Accordion.Body>Security details...</Accordion.Body>
  </Accordion.Item>
</Accordion>
```

## Minimal implementation sketch

```tsx
type AccordionContextValue = {
  openValue: string | null;
  setOpenValue: (value: string | null) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function Accordion({ children }: { children: ReactNode }) {
  const [openValue, setOpenValue] = useState<string | null>(null);

  return (
    <AccordionContext.Provider value={{ openValue, setOpenValue }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}

function useAccordion() {
  const context = useContext(AccordionContext);

  if (!context) {
    throw new Error("Accordion components must be used inside Accordion");
  }

  return context;
}
```

## Rule of thumb

If customization keeps adding props, move customization into composition.
