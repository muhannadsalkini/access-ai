import cors from "cors";
import { env } from "../config/env";

// Build the origin allow-list.
// EXTENSION_ORIGIN can be a specific chrome-extension:// URL,
// or set to "chrome-extension://*" to allow any extension during development.
const allowedOrigins: (string | RegExp)[] = [
  env.frontendUrl,
  "http://localhost:3000",
  // Always allow all Chrome extension origins
  /^chrome-extension:\/\//,
];

if (env.extensionOrigin && env.extensionOrigin !== "chrome-extension://*") {
  // Allow a specific extension origin if explicitly configured
  allowedOrigins.push(env.extensionOrigin);
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);

    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );

    if (allowed) {
      callback(null, true);
    } else {
      // Return null (block) instead of throwing — this avoids an unhandled
      // Error propagating to the generic 500 error handler.
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
