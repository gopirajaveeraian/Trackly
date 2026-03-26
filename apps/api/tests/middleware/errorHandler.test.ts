import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  errorHandler,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../src/middleware/errorHandler';

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('Error Handler', () => {
  describe('Custom Error Classes', () => {
    it('NotFoundError has status 404', () => {
      const err = new NotFoundError('User');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
    });

    it('UnauthorizedError has status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });

    it('ForbiddenError has status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Forbidden');
    });

    it('ConflictError has status 409', () => {
      const err = new ConflictError('Duplicate entry');
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Duplicate entry');
    });
  });

  describe('errorHandler middleware', () => {
    it('handles ZodError with 400 status', () => {
      const schema = z.object({ name: z.string() });
      let zodError: ZodError;
      try {
        schema.parse({ name: 123 });
      } catch (e) {
        zodError = e as ZodError;
      }
      const res = createMockRes();

      errorHandler(zodError!, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation error',
        }),
      );
    });

    it('handles AppError with correct status', () => {
      const res = createMockRes();
      errorHandler(new NotFoundError('Issue'), mockReq, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('handles JWT errors with 401', () => {
      const res = createMockRes();
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      errorHandler(err, mockReq, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles TokenExpiredError with 401', () => {
      const res = createMockRes();
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      errorHandler(err, mockReq, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles unknown errors with 500', () => {
      const res = createMockRes();
      errorHandler(new Error('Something broke'), mockReq, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
