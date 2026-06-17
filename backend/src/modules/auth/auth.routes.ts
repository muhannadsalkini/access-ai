import { Router } from "express";
import * as authController from "./auth.controller";
import { authLimiter } from "../../middleware/rate-limiter";

const router = Router();

// POST /api/auth/login — Login with email & password (returns JWT token)
// authLimiter: 10 attempts per 15 min per IP+email to block brute-force attacks
router.post("/login", authLimiter, authController.login as any);

export default router;
