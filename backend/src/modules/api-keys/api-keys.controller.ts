import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/auth.types";
import { AppError } from "../../middleware/error-handler";
import * as apiKeysService from "./api-keys.service";

/**
 * POST /api/api-keys — Create a new API key
 */
export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body || {};
    const result = await apiKeysService.createApiKey(
      req.userId,
      name || "Default"
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/api-keys — List all API keys for the user
 */
export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const keys = await apiKeysService.getApiKeys(req.userId);

    res.json({
      success: true,
      data: keys,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/api-keys/:id — Delete an API key
 */
export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const keyId = req.params.id as string;
    if (!keyId) {
      throw new AppError("API key ID is required.", 400);
    }

    await apiKeysService.deleteApiKey(keyId, req.userId);

    res.json({
      success: true,
      message: "API key deleted.",
    });
  } catch (err) {
    next(err);
  }
}
