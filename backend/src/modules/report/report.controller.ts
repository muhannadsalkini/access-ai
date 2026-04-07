import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../auth/auth.types";
import * as reportService from "./report.service";
import { AppError } from "../../middleware/error-handler";

export async function getReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const scanId = req.params.scanId as string;

    if (!scanId) {
      throw new AppError("Scan ID is required.", 400);
    }

    const report = await reportService.getReportByScanId(scanId, req.userId);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
}
