import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import * as reportController from "./report.controller";

const router = Router();

// All report routes require authentication
router.use(requireAuth as any);

// GET /api/reports/:scanId — Get report for a specific scan
router.get("/:scanId", reportController.getReport as any);

export default router;
