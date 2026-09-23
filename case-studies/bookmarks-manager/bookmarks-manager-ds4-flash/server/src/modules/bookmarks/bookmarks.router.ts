/**
 * @module modules/bookmarks/bookmarks.router
 * Bookmark route definitions.
 */

import { Router } from "express";
import * as controller from "./bookmarks.controller.js";

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.delete("/:id", controller.remove);

export { router as bookmarksRouter };
