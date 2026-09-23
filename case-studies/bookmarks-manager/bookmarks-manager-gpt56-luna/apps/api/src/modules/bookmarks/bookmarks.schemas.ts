/** Runtime validation schemas for bookmark API payloads. */
import { z } from "zod";

export const bookmarkInputSchema = z.object({
  url: z.string().trim().url().max(2_048),
});

export const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
