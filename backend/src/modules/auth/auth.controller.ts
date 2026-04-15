import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler";
import { loginWithEmail } from "./auth.service";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required.", 400);
    }

    const result = await loginWithEmail(email, password);

    res.json({
      success: true,
      data: {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        expires_in: result.expiresIn,
        user: {
          id: result.userId,
          email: result.userEmail,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
