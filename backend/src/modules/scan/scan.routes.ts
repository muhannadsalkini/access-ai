import { Router } from "express";
import { requireAuth, optionalAuth } from "../auth/auth.middleware";
import { scanLimiter } from "../../middleware/rate-limiter";
import * as scanController from "./scan.controller";
import * as chatController from "../chat/chat.controller";

const router = Router();

// POST /api/scans — Create a new scan from a URL (guest mode supported)
router.post("/", optionalAuth as any, scanLimiter, scanController.createScan as any);

// POST /api/scans/code — Create a new scan from raw HTML code (guest mode supported)
router.post("/code", optionalAuth as any, scanLimiter, scanController.createCodeScan as any);

// All read/chat routes require authentication
// GET /api/scans — Get user's scan history
router.get("/", requireAuth as any, scanController.getScans as any);

// GET /api/scans/:id — Get a specific scan with issues and report
router.get("/:id", requireAuth as any, scanController.getScanById as any);

// DELETE /api/scans/:id — Delete a scan and all related data
router.delete("/:id", requireAuth as any, scanController.deleteScan as any);

// GET /api/scans/:scanId/chat — Get chat messages for a scan
router.get("/:scanId/chat", requireAuth as any, chatController.getMessages as any);

// POST /api/scans/:scanId/chat — Send a chat message
router.post("/:scanId/chat", requireAuth as any, chatController.sendMessage as any);

// DELETE /api/scans/:scanId/chat — Clear all chat messages
router.delete("/:scanId/chat", requireAuth as any, chatController.clearMessages as any);

// POST /api/scans/:scanId/chat/stream — Send a chat message with streaming response
router.post("/:scanId/chat/stream", requireAuth as any, chatController.sendMessageStream as any);

export default router;
