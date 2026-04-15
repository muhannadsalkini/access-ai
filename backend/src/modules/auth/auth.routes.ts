import { Router } from "express";
import * as authController from "./auth.controller";

const router = Router();

// POST /api/auth/login — Login with email & password (returns JWT token)
router.post("/login", authController.login as any);

export default router;
