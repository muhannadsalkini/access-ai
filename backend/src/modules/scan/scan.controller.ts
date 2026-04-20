import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/auth.types";
import { createScanSchema } from "./scan.validator";
import * as scanService from "./scan.service";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";

export async function createScan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const parsed = createScanSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new AppError(message, 400);
    }

    // Guest mode — no userId means no DB persistence
    if (!req.userId) {
      logger.info(`[guest] Scan requested for: ${parsed.data.url}`);
      const result = await scanService.createGuestScan(parsed.data.url);
      return void res.status(201).json({ success: true, data: result });
    }

    logger.info(`User ${req.userId} requested scan for: ${parsed.data.url}`);
    const result = await scanService.createScan(req.userId, parsed.data.url);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/scans/stream — streams scan progress + AI analysis as SSE.
 *
 * Unlike createScan (which blocks until the full report is ready), this
 * endpoint flushes intermediate events to the client:
 *   - status           : pipeline stage
 *   - scan             : the scan row (so the UI can grab the scan.id early)
 *   - progress         : free-form progress message
 *   - violations_found : raw axe counts + deterministic score
 *   - summary          : AI-generated summary / priority recommendations
 *   - issue            : one enriched issue (streamed as Gemini emits them)
 *   - done             : terminal event with final scan record
 *   - error            : terminal error event
 *
 * Each event is delivered as a line:  event: <name>\ndata: <json>\n\n
 */
export async function createScanStream(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createScanSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new AppError(message, 400);
    }

    logger.info(
      `${req.userId ? `User ${req.userId}` : "[guest]"} requested STREAM scan for: ${parsed.data.url}`
    );

    // SSE headers — disable proxy buffering so each write is flushed promptly.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Heartbeat so intermediate proxies don't close the connection during the
    // long quiet stretch between "scanning" and "analyzing".
    const heartbeat = setInterval(() => {
      res.write(`: keep-alive ${Date.now()}\n\n`);
    }, 15_000);

    let clientClosed = false;
    req.on("close", () => {
      clientClosed = true;
      clearInterval(heartbeat);
    });

    try {
      for await (const evt of scanService.createScanStream(
        req.userId || null,
        parsed.data.url
      )) {
        if (clientClosed) break;
        writeEvent(evt.type, evt);
      }
    } catch (err: any) {
      if (!clientClosed) {
        writeEvent("error", {
          type: "error",
          message: err?.message ?? "Scan failed",
        });
      }
    } finally {
      clearInterval(heartbeat);
      if (!clientClosed) res.end();
    }
  } catch (err) {
    next(err);
  }
}

export async function getScans(

  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scans = await scanService.getScansByUser(req.userId);

    res.json({
      success: true,
      data: scans,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCodeScan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { html, title } = req.body;

    if (!html || typeof html !== "string" || html.trim().length === 0) {
      throw new AppError("html is required.", 400);
    }

    // Guest mode — no userId means no DB persistence
    if (!req.userId) {
      logger.info(`[guest] Code scan requested`);
      const result = await scanService.createGuestCodeScan(html, title);
      return void res.status(201).json({ success: true, data: result });
    }

    logger.info(`User ${req.userId} requested code scan`);

    const result = await scanService.createCodeScan(req.userId, html, title);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getScanById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!id) {
      throw new AppError("Scan ID is required.", 400);
    }

    const result = await scanService.getScanById(id, req.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function fixCode(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { html, title } = req.body;

    if (!html || typeof html !== "string" || html.trim().length === 0) {
      throw new AppError("html is required.", 400);
    }

    logger.info(`[fix] ${req.userId ? `User ${req.userId}` : "[guest]"} requested fix_code`);

    const result = await scanService.fixCode(html, req.userId, title);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteScan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!id) {
      throw new AppError("Scan ID is required.", 400);
    }

    await scanService.deleteScan(id, req.userId);

    res.json({ success: true, data: { message: "Scan deleted successfully." } });
  } catch (err) {
    next(err);
  }
}
