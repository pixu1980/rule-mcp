

/**
 * @module core/review/roles
 *
 * The expert review personas: who can be asked to audit this project, what
 * they know, and what they look at (personas plan, phase A.1).
 *
 * A persona is data, not a prompt. One registry entry fills one template, and
 * every surface - the MCP prompt, the agent command, the skill, the tool -
 * is generated from that entry, so a role gains a lens in one place and
 * every entry point says the same thing.
 *
 * `status` is the lifecycle: `active` roles are generated onto every surface,
 * `proposed` ones wait in the catalog until someone asks for them, and
 * `deprecated` ones disappear from the surfaces but keep their entry and
 * their documents - deleting an id would make an old audit unattributable.
 */

export * from "./_catalog.js";
export * from "./_validate.js";
export * from "./_query.js";
export * from "./_detect.js";
export * from "./_command-name.js";
