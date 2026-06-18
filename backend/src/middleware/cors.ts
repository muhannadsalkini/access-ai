import cors from "cors";
import { env } from "../config/env";

// Build the origin allow-list.
//
// In PRODUCTION: only allow the exact extension ID set in EXTENSION_ORIGIN.
//   Allowing a wildcard regex lets any installed Chrome extension make
//   authenticated requests on behalf of the user — a significant CSRF risk.
//
// In DEVELOPMENT: fall back to the broad regex so local extension builds work
//   without needing to know the extension ID.
const allowedOrigins: (string | RegExp)[] = [
  env.frontendUrl,
  "http://localhost:3000",
];

if (env.nodeEnv === "development") {
  // Dev only — accept any chrome-extension:// origin for convenience
  allowedOrigins.push(/^chrome-extension:\/\//);
} else if (env.extensionOrigin) {
  // Production — lock to the specific extension ID
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
