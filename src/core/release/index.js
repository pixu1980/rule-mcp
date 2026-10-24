

/**
 * @module core/release
 *
 * Release-tooling discovery for `/rule-mcp-init` (WS7.1).
 *
 * The plan's rule here is reuse, not installation: a project that already has a
 * changelog generator, a version script or a release workflow keeps it, and the
 * first step is to say what is there.
 */

export * from "./_detect.js";
export * from "./_pins.js";
export * from "./_render.js";
