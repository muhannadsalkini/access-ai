import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import * as apiKeysController from "./api-keys.controller";

const router = Router();

// All API key management routes require JWT auth (not API key auth)
router.use(requireAuth as any);

// POST /api/api-keys — Create a new API key
router.post("/", apiKeysController.create as any);

// GET /api/api-keys — List all API keys
router.get("/", apiKeysController.list as any);

// DELETE /api/api-keys/:id — Delete an API key
router.delete("/:id", apiKeysController.remove as any);

export default router;
