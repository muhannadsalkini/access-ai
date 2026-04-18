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
