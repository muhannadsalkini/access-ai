import { Request, Response, NextFunction } from "express";
import { getChatMessages, sendChatMessage, sendChatMessageStream, clearChatMessages } from "./chat.service";
import { logger } from "../../utils/logger";

/**
 * GET /api/scans/:scanId/chat — Get all chat messages for a scan
 */
export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scanId = req.params.scanId as string;
    const messages = await getChatMessages(scanId);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error("Get chat messages error:", error);
    next(error);
  }
}

/**
 * POST /api/scans/:scanId/chat — Send a message and get AI response
 */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scanId = req.params.scanId as string;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 characters)" });
      return;
    }

    const result = await sendChatMessage(scanId, message.trim());
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Send chat message error:", error);
    next(error);
  }
}

/**
 * DELETE /api/scans/:scanId/chat — Clear all chat messages for a scan
 */
export async function clearMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scanId = req.params.scanId as string;
    await clearChatMessages(scanId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error("Clear chat messages error:", error);
    next(error);
  }
}

/**
 * POST /api/scans/:scanId/chat/stream — Send a message and stream AI response via SSE
 */
export async function sendMessageStream(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scanId = req.params.scanId as string;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 characters)" });
      return;
    }

    // Set SSE headers and disable all buffering
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Disable Nagle's algorithm to send chunks immediately
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);

    res.flushHeaders();

    await sendChatMessageStream(scanId, message.trim(), res);
  } catch (error: any) {
    logger.error("Stream chat message error:", error);
    // If headers already sent, send error as SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
}
