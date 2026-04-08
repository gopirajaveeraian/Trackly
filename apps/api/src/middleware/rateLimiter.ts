import { rateLimit } from 'express-rate-limit';

/**
 * Global rate limiter - 100 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    statusCode: 429,
  },
});

/**
 * Strict rate limiter for auth routes - 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    statusCode: 429,
  },
});

/**
 * Strict login limiter - 5 failed attempts per 30 minutes per IP.
 * Prevents brute-force password attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 30 minutes',
    statusCode: 429,
  },
});
