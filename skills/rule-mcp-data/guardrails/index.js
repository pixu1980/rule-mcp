/** The rules rule-mcp-data owns, in canonical order. */
import { connectionPool } from "./_connection-pool.js";
import { migrationSafety } from "./_migration-safety.js";
import { parameterizedQueries } from "./_parameterized-queries.js";
import { transactionSafety } from "./_transaction-safety.js";

export const GUARDRAILS = [connectionPool, migrationSafety, parameterizedQueries, transactionSafety];
