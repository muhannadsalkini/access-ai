import cors from "cors";
import { env } from "../config/env";

// Build the origin allow-list.
// EXTENSION_ORIGIN can be a specific chrome-extension:// URL,
// or set to "chrome-extension://*" to allow any extension during development.
const allowedOrigins: (string | RegExp)[] = [
  env.frontendUrl,
  "http://localhost:3000",
];

if (env.extensionOrigin) {
  if (env.extensionOrigin === "chrome-extension://*") {
    // Allow all Chrome extension origins (dev convenience)
    allowedOrigins.push(/^chrome-extension:\/\//);
  } else {
    allowedOrigins.push(env.extensionOrigin);
  }
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
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
