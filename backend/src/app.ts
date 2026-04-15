import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./middleware/cors";
import { generalLimiter } from "./middleware/rate-limiter";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./modules/auth/auth.routes";
import apiKeysRoutes from "./modules/api-keys/api-keys.routes";
import scanRoutes from "./modules/scan/scan.routes";
import reportRoutes from "./modules/report/report.routes";

const app = express();

// --- Global Middleware ---
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(generalLimiter);

// --- Health Check ---
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "accessai-backend",
    timestamp: new Date().toISOString(),
  });
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/api-keys", apiKeysRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/reports", reportRoutes);

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// --- Error Handler ---
app.use(errorHandler);

export default app;
