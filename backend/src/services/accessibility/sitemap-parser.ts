import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";

const MAX_SITEMAP_URLS = 10;

/**
 * Detect if a URL points to a sitemap (XML).
 */
export function isSitemapUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.endsWith(".xml");
  } catch {
    return false;
  }
}

/**
 * Fetch and parse a sitemap XML, returning up to MAX_SITEMAP_URLS page URLs.
 * Supports both regular sitemaps (<urlset>) and sitemap indexes (<sitemapindex>).
 */
export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  logger.info(`Fetching sitemap: ${sitemapUrl}`);

  let xml: string;
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        "User-Agent": "AccessAI-Bot/1.0",
        Accept: "application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    xml = await response.text();
  } catch (error) {
    logger.error(`Failed to fetch sitemap: ${error}`);
    throw new AppError(
      "Could not fetch the sitemap. Please check the URL and try again.",
      400
    );
  }

  // Check if it's valid XML with sitemap content
  if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) {
    throw new AppError(
      "The URL does not appear to be a valid XML sitemap.",
      400
    );
  }

  const urls: string[] = [];

  // Handle sitemap index — extract child sitemap URLs and parse first one
  if (xml.includes("<sitemapindex")) {
    const childSitemaps = extractTagContent(xml, "sitemap", "loc");
    if (childSitemaps.length > 0) {
      // Parse the first child sitemap only (to stay within limits)
      logger.info(
        `Sitemap index found with ${childSitemaps.length} child sitemaps. Parsing first one.`
      );
      try {
        const childUrls = await parseSitemap(childSitemaps[0]);
        return childUrls.slice(0, MAX_SITEMAP_URLS);
      } catch {
        throw new AppError(
          "Could not parse child sitemaps from the sitemap index.",
          400
        );
      }
    }
  }

  // Regular sitemap — extract <loc> URLs from <url> entries
  const locMatches = xml.match(/<loc>\s*(.*?)\s*<\/loc>/gi);
  if (locMatches) {
    for (const match of locMatches) {
      const url = match.replace(/<\/?loc>/gi, "").trim();
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        urls.push(url);
      }
      if (urls.length >= MAX_SITEMAP_URLS) break;
    }
  }

  if (urls.length === 0) {
    throw new AppError(
      "No valid page URLs found in the sitemap.",
      400
    );
  }

  logger.info(`Extracted ${urls.length} URLs from sitemap (max ${MAX_SITEMAP_URLS})`);
  return urls;
}

/**
 * Helper to extract <loc> content from parent tags in XML.
 */
function extractTagContent(
  xml: string,
  parentTag: string,
  childTag: string
): string[] {
  const results: string[] = [];
  const parentRegex = new RegExp(
    `<${parentTag}[^>]*>([\\s\\S]*?)<\\/${parentTag}>`,
    "gi"
  );
  let parentMatch;
  while ((parentMatch = parentRegex.exec(xml)) !== null) {
    const inner = parentMatch[1];
    const childRegex = new RegExp(
      `<${childTag}>\\s*(.*?)\\s*<\\/${childTag}>`,
      "i"
    );
    const childMatch = childRegex.exec(inner);
    if (childMatch) {
      results.push(childMatch[1].trim());
    }
  }
  return results;
}
