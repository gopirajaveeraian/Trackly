import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../../src/middleware/errorHandler';

describe('Error Classes', () => {
  it('should create AppError with status code', () => {
    const error = new AppError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create NotFoundError with 404', () => {
    const error = new NotFoundError('User');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
  });

  it('should create UnauthorizedError with 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('should create ForbiddenError with 403', () => {
    const error = new ForbiddenError('No access');
    expect(error.statusCode).toBe(403);
  });

  it('should create ConflictError with 409', () => {
    const error = new ConflictError('Already exists');
    expect(error.statusCode).toBe(409);
  });
});

describe('Zod Validation', () => {
  const createIssueSchema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    type: z.enum(['BUG', 'STORY', 'TASK', 'EPIC', 'SUBTASK']),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    statusId: z.string().uuid(),
    projectId: z.string().uuid(),
  });

  it('should validate a valid issue', () => {
    const result = createIssueSchema.safeParse({
      title: 'Test Issue',
      type: 'BUG',
      priority: 'HIGH',
      statusId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const result = createIssueSchema.safeParse({
      title: '',
      type: 'BUG',
      priority: 'HIGH',
      statusId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid issue type', () => {
    const result = createIssueSchema.safeParse({
      title: 'Test',
      type: 'INVALID',
      priority: 'HIGH',
      statusId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid UUID for statusId', () => {
    const result = createIssueSchema.safeParse({
      title: 'Test',
      type: 'BUG',
      priority: 'HIGH',
      statusId: 'not-a-uuid',
      projectId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(false);
  });
});
