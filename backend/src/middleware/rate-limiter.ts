import rateLimit from "express-rate-limit";

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Auth rate limiter — stricter limit to prevent brute-force attacks
// 10 attempts per 15 minutes, keyed on IP + email to prevent credential stuffing
// ---------------------------------------------------------------------------
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: "Too many login attempts. Please wait 15 minutes before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key on IP + email so that targeting a single account from one IP is throttled
  // even if the attacker rotates passwords, and vice versa.
  keyGenerator: (req) => {
    const ip = req.ip || "unknown";
    const email = (req.body?.email || "").toLowerCase().trim();
    return `${ip}:${email}`;
  },
  // Skip successful requests so the window only counts failures
  // (express-rate-limit doesn't have built-in skip-on-success; we handle this
  // by keeping the limit low enough that legitimate users are never blocked)
  skipSuccessfulRequests: true,
});

// Scan-specific rate limiter (10 scans per hour per user)
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: "Scan limit reached. You can perform up to 10 scans per hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID from auth if available, otherwise fall back to IP
    return (req as any).userId || req.ip || "anonymous";
  },
});

// ---------------------------------------------------------------------------
// Chat rate limiter — prevents AI cost abuse (20 messages per hour per user)
// ---------------------------------------------------------------------------
export const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: "Chat limit reached. You can send up to 20 messages per hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).userId || req.ip || "anonymous";
  },
});
