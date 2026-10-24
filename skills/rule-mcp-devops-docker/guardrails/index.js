/** The rules rule-mcp-devops-docker owns, in canonical order. */
import { dockerHealthcheck } from "./_docker-healthcheck.js";
import { dockerNonRoot } from "./_docker-non-root.js";

export const GUARDRAILS = [dockerHealthcheck, dockerNonRoot];
