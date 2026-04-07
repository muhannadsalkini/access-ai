import cors from "cors";
import { env } from "../config/env";

export const corsMiddleware = cors({
  origin: [env.frontendUrl, "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
