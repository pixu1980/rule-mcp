/** The rules pix-devops-docker owns, in canonical order. */
import { dockerNonRoot } from "./_docker-non-root.js";
import { dockerHealthcheck } from "./_docker-healthcheck.js";

export const GUARDRAILS = [dockerNonRoot, dockerHealthcheck];
