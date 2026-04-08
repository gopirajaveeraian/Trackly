import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { Role } from '@prisma/client';
import { validateApiKey } from '../services/api-key.service';

/**
 * Payload stored in JWT tokens.
 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Extends Express Request to include the authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches user info to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Access token is required');
    }

    // Support API key authentication: "Bearer trk_..."
    if (authHeader.startsWith('Bearer trk_')) {
      const apiKey = authHeader.split(' ')[1];
      const keyData = await validateApiKey(apiKey);

      if (!keyData) {
        throw new UnauthorizedError('Invalid or expired API key');
      }

      req.user = {
        userId: keyData.userId,
        email: keyData.email,
      };

      next();
      return;
    }

    // Standard JWT authentication: "Bearer <jwt>"
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based authorization middleware.
 * Must be used after authenticate middleware.
 * Checks if the user has the required role in the specified workspace.
 *
 * @param allowedRoles - Roles that are allowed to access the route
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Extract workspaceId from params, query, or body
      const workspaceId =
        (req.params.workspaceId as string | undefined) ??
        (req.query.workspaceId as string | undefined) ??
        (req.body?.workspaceId as string | undefined);

      if (!workspaceId) {
        throw new ForbiddenError('Workspace context required for role check');
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.userId,
            workspaceId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenError('You are not a member of this workspace');
      }

      if (!allowedRoles.includes(membership.role)) {
        throw new ForbiddenError(
          `Role '${membership.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
