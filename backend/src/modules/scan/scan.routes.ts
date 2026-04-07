import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { scanLimiter } from "../../middleware/rate-limiter";
import * as scanController from "./scan.controller";

const router = Router();

// All scan routes require authentication
router.use(requireAuth as any);

// POST /api/scans — Create a new scan
router.post("/", scanLimiter, scanController.createScan as any);

// GET /api/scans — Get user's scan history
router.get("/", scanController.getScans as any);

// GET /api/scans/:id — Get a specific scan with issues and report
router.get("/:id", scanController.getScanById as any);

export default router;
