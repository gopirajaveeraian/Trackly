import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom application error class for throwing structured HTTP errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Not Found error helper.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

/**
 * Unauthorized error helper.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden error helper.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Conflict error helper (e.g., duplicate resource).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

interface ErrorResponseBody {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
  stack?: string;
}

/**
 * Centralized error handler middleware.
 * Catches all errors, normalizes them, and returns structured JSON responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const response: ErrorResponseBody = {
    success: false,
    message: 'Internal server error',
    statusCode: 500,
  };

  // Zod validation errors
  if (err instanceof ZodError) {
    response.statusCode = 400;
    response.message = 'Validation error';
    response.errors = err.flatten().fieldErrors as Record<string, string[]>;
    res.status(response.statusCode).json(response);
    return;
  }

  // Custom application errors
  if (err instanceof AppError) {
    response.statusCode = err.statusCode;
    response.message = err.message;
    res.status(response.statusCode).json(response);
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) ?? [];
        response.statusCode = 409;
        response.message = `A record with this ${target.join(', ')} already exists`;
        break;
      }
      case 'P2025':
        response.statusCode = 404;
        response.message = 'Record not found';
        break;
      case 'P2003':
        response.statusCode = 400;
        response.message = 'Related record not found';
        break;
      default:
        response.statusCode = 400;
        response.message = 'Database operation failed';
    }
    res.status(response.statusCode).json(response);
    return;
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    response.statusCode = 400;
    response.message = 'Invalid data provided';
    res.status(response.statusCode).json(response);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    response.statusCode = 401;
    response.message = 'Invalid token';
    res.status(response.statusCode).json(response);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    response.statusCode = 401;
    response.message = 'Token expired';
    res.status(response.statusCode).json(response);
    return;
  }

  // Fallback: unknown error
  if (process.env.NODE_ENV === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  console.error('[ERROR]', err);
  res.status(response.statusCode).json(response);
}
