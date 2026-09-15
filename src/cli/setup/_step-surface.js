/**
 * @module cli/setup/step-surface
 *
 * Step 6: which tools the installed server exposes, apart from the command
 * files the Commands step writes.
 *
 * Same drill-down shape as the commands picker - a preset for the common
 * case, areas then skills only for whoever picks Custom - because a second
 * invented navigation is a second thing to learn for one question. The counts
 * say what each choice keeps: a preset whose price is invisible is chosen
 * blind, and a blind surface choice is a broken agent.
 */

import { h, useState } from "./_h.js";
import { Stage } from "./_step-commands.js";
import { areasOfSkills } from "../../core/skills/_surface.js";
import { MINIMAL_ALLOWLIST } from "../../core/skills/_minimal.js";
import { getSkillNames } from "../../tools/router/index.js";

/** The presets, plus the way out of the one-screen case. */
export function surfacePresetItems() {
  const skills = getSkillNames();
  const hubs = skills.filter((name) => name.split("-").length === 2).length;

  return [
    { id: "full", label: `Full (${skills.length} skill tools + utilities)`, detail: ["Every skill tool, for whoever bills tokens by the value."] },
    { id: "standard", label: `Standard (${hubs} hub tools + utilities)`, detail: ["The area hubs only: every area reachable, no member tools."] },
    { id: "minimal", label: `Minimal (${MINIMAL_ALLOWLIST.size} tools)`, detail: ["The dispatcher and its action tools; skills load through the gateway."] },
    { id: "custom", label: "Custom", detail: ["Choose areas, then skills.", "", "Two more screens, and only for whoever asks."] },
  ];
}

/** One row per area the catalog covers, with its skill count. */
export function surfaceAreaItems() {
  const skills = getSkillNames();

  return areasOfSkills(skills).map((area) => {
    const members = skills.filter((name) => name === `rule-${area}` || name.startsWith(`rule-${area}-`));

    return { id: area, label: `${area} (${members.length} skills)`, detail: [`The ${area} hub and its ${members.length - 1} member skills.`] };
  });
}

/** The skills of the chosen areas, hub rows first. */
export function surfaceSkillItems(areas) {
  const skills = getSkillNames().filter((name) => areas.includes(name.split("-", 2)[1]));

  return skills.map((name) => ({ id: name, label: name, detail: name.split("-").length === 2 ? ["Area hub: kept either way."] : ["Member skill tool."] }));
}

/**
 * @param {{ initial: object|null, columns: number, height: number, onSubmit: Function, onBack: Function }} props
 */
export function StepSurface({ initial, columns, height, onSubmit, onBack }) {
  const [stage, setStage] = useState("preset");
  const [areas, setAreas] = useState(initial?.areas ?? []);
  const body = Math.max(5, Math.min(height, 10));

  if (stage === "areas") {
    const items = surfaceAreaItems();

    return h(Stage, {
      key: "areas",
      title: "Which areas serve tools?",
      items,
      initial: areas.length > 0 ? areas : items.map((item) => item.id),
      columns,
      height: body,
      onSubmit: (picked) => {
        setAreas(picked);

        if (picked.length === 0) {
          onSubmit({ areas: picked });

          return;
        }

        setStage("skills");
      },
      onBack: () => setStage("preset"),
    });
  }

  if (stage === "skills") {
    const items = surfaceSkillItems(areas);

    return h(Stage, {
      key: "skills",
      title: "Which skills? (the area hubs are kept either way)",
      items,
      initial: items.map((item) => item.id),
      columns,
      height: Math.max(body, 10),
      onSubmit: (picked) => onSubmit(picked.length === items.length ? { areas } : { skills: picked }),
      onBack: () => setStage("areas"),
    });
  }

  return h(Stage, {
    key: "preset",
    title: "Which server tools?",
    items: surfacePresetItems(),
    initial: initial?.preset ? [initial.preset] : ["full"],
    mode: "radio",
    columns,
    height: body,
    onSubmit: (picked) => (picked === "custom" ? setStage("areas") : onSubmit({ preset: picked })),
    onBack,
  });
}

/** One line for the review screen: what the surface answer keeps. */
export function surfaceLabel(surface) {
  if (!surface) {
    return "full surface";
  }

  if (surface.preset) {
    return `surface ${surface.preset}`;
  }

  return `surface ${surface.areas ? `areas ${surface.areas.join(",")}` : `${surface.skills.length} skills`}`;
}

