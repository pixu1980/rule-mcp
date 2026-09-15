/**
 * @module cli/setup/step-commands
 *
 * Step 5: which slash commands the install writes.
 *
 * One screen for the common case - a preset, one keystroke - and three more
 * only for whoever picks Custom. A picker that always demanded four screens
 * is a picker people learn to press Enter through, which is the same as not
 * asking; and not asking means 150-odd files per agent directory.
 *
 * The stages are a state machine in here rather than rail entries, because
 * three of the four are conditional and a rail that grays out most of itself
 * reads as a broken install rather than a short one.
 */

import { Box, Text, h, useState } from "./_h.js";
import { areaItems, familyItems, presetItems, skillItems } from "./_commands-items.js";
import { COLORS } from "./_theme.js";
import { ListDetail } from "./_widget-list.js";
import { useSelection } from "./_use-selection.js";

/**
 * One stage of the drill-down: a titled list with its detail panel.
 *
 * Mounted with a `key` per stage by the caller, so the cursor and the ticks
 * start where the new list starts rather than where the last one ended.
 *
 * @param {{ title: string, items: object[], initial: string[], mode?: string, columns: number, height: number, onSubmit: Function, onBack: Function }} props
 */
export function Stage({ title, items, initial, mode = "check", columns, height, onSubmit, onBack }) {
  const { cursor, selected, current } = useSelection(items, { initial, mode, onSubmit, onBack });

  return h(Box, { flexDirection: "column" }, h(Text, { color: COLORS.accentSoft, bold: true }, title), h(ListDetail, { items, cursor, selected, current, mode, height, columns }));
}

/**
 * @param {{ initial: object|null, columns: number, height: number, onSubmit: Function, onBack: Function }} props
 */
export function StepCommands({ initial, columns, height, onSubmit, onBack }) {
  const [stage, setStage] = useState("preset");
  const [families, setFamilies] = useState(initial?.families ?? ["areas", "tasks"]);
  const [areas, setAreas] = useState(initial?.areas ?? []);
  const body = Math.max(5, Math.min(height, 10));

  if (stage === "families") {
    return h(Stage, {
      key: "families",
      title: "Which families?",
      items: familyItems(),
      initial: families,
      columns,
      height: body,
      onSubmit: (picked) => {
        setFamilies(picked);

        if (picked.includes("areas")) {
          setStage("areas");

          return;
        }

        onSubmit({ families: picked });
      },
      onBack: () => setStage("preset"),
    });
  }

  if (stage === "areas") {
    const items = areaItems();

    return h(Stage, {
      key: "areas",
      title: "Which areas?",
      items,
      initial: areas.length > 0 ? areas : items.map((item) => item.id),
      columns,
      height: body,
      onSubmit: (picked) => {
        setAreas(picked);
        // Nothing ticked leaves the family without members, and a skills
        // screen with no rows on it is a screen that cannot be answered.
        if (picked.length === 0) {
          onSubmit({ families, areas: picked });

          return;
        }

        setStage("skills");
      },
      onBack: () => setStage("families"),
    });
  }

  if (stage === "skills") {
    const items = skillItems(areas);

    return h(Stage, {
      key: "skills",
      title: "Which skills? (the area hubs are kept either way)",
      items,
      initial: items.filter((item) => !item.section).map((item) => item.id),
      columns,
      height: Math.max(body, 10),
      onSubmit: (picked) => onSubmit({ families, areas, skills: picked }),
      onBack: () => setStage("areas"),
    });
  }

  return h(Stage, {
    key: "preset",
    title: "Which commands?",
    items: presetItems(),
    initial: [initial?.preset ?? "standard"],
    mode: "radio",
    columns,
    height: body,
    onSubmit: (picked) => (picked === "custom" ? setStage("families") : onSubmit({ preset: picked })),
    onBack,
  });
}
