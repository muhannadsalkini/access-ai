import { AppError } from "../../middleware/error-handler";
import dns from "dns";
import { promisify } from "util";
import net from "net";

const dnsResolve = promisify(dns.resolve);

// Private/internal IP ranges to block (SSRF protection)
const BLOCKED_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Private Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
  /^192\.168\./,               // Private Class C
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^::1$/,                     // IPv6 loopback
  /^fc00:/,                    // IPv6 unique local
  /^fe80:/,                    // IPv6 link-local
];

function isPrivateIP(ip: string): boolean {
  return BLOCKED_IP_RANGES.some((pattern) => pattern.test(ip));
}

export async function validateUrl(url: string): Promise<string> {
  // Parse and validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AppError("Invalid URL format. Please provide a valid URL.", 400);
  }

  // Only allow http and https protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AppError(
      "Only HTTP and HTTPS protocols are allowed.",
      400
    );
  }

  // Block localhost and common internal hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  const blockedHostnames = ["localhost", "0.0.0.0", "[::]", "[::1]"];
  if (blockedHostnames.includes(hostname)) {
    throw new AppError("Scanning internal/local URLs is not allowed.", 400);
  }

  // Check if hostname is an IP address
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new AppError(
        "Scanning private/internal IP addresses is not allowed.",
        400
      );
    }
    return parsedUrl.toString();
  }

  // DNS resolution check — block private IPs
  try {
    const addresses = await dnsResolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        throw new AppError(
          "The URL resolves to a private/internal IP address. Scanning is not allowed.",
          400
        );
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "Could not resolve the URL. Please check that the website exists.",
      400
    );
  }

  return parsedUrl.toString();
}
