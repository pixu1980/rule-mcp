/**
 * src/tools: the action-tool family is the public barrel. Gateway and apply
 * stay off it: they belong to `bootstrapCoreTools()`, which the catalog must
 * not reach.
 */
export * from "./actions/index.js";
