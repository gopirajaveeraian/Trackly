import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

/**
 * POST /api/auth/register
 * Registers a new user and returns tokens.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticates user and returns tokens.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Logs out the current user by invalidating their refresh token.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    await authService.logout(req.user.userId);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refreshes access token using a valid refresh token.
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
      message: 'Token refreshed',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Initiates the password reset flow.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);

    // Always return success to avoid email enumeration
    res.status(200).json({
      success: true,
      data: null,
      message: 'If an account with that email exists, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Resets a user's password with a valid reset token.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
}
