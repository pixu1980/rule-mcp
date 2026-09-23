/** Frontend API contract mirrored from the versioned Express resource. */
import { z } from "zod";

export const bookmarkResponseSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  description: z.string(),
  image: z.string().url().nullable(),
  domain: z.string(),
  preview: z.string(),
  createdAt: z.string(),
});

export const bookmarkPreviewSchema = bookmarkResponseSchema
  .omit({ id: true, createdAt: true })
  .extend({ url: z.string().url() });
export type Bookmark = z.infer<typeof bookmarkResponseSchema>;
export type BookmarkPreview = z.infer<typeof bookmarkPreviewSchema>;
