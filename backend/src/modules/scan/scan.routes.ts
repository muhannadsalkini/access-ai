import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { scanLimiter } from "../../middleware/rate-limiter";
import * as scanController from "./scan.controller";
import * as chatController from "../chat/chat.controller";

const router = Router();

// All scan routes require authentication
router.use(requireAuth as any);

// POST /api/scans — Create a new scan from a URL
router.post("/", scanLimiter, scanController.createScan as any);

// POST /api/scans/code — Create a new scan from raw HTML code
router.post("/code", scanLimiter, scanController.createCodeScan as any);

// GET /api/scans — Get user's scan history
router.get("/", scanController.getScans as any);

// GET /api/scans/:id — Get a specific scan with issues and report
router.get("/:id", scanController.getScanById as any);

// GET /api/scans/:scanId/chat — Get chat messages for a scan
router.get("/:scanId/chat", chatController.getMessages as any);

// POST /api/scans/:scanId/chat — Send a chat message
router.post("/:scanId/chat", chatController.sendMessage as any);

// DELETE /api/scans/:scanId/chat — Clear all chat messages
router.delete("/:scanId/chat", chatController.clearMessages as any);

// POST /api/scans/:scanId/chat/stream — Send a chat message with streaming response
router.post("/:scanId/chat/stream", chatController.sendMessageStream as any);

export default router;
