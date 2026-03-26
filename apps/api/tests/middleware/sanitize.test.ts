import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { sanitizeBody } from '../../src/middleware/sanitize';

function createReqWithBody(body: unknown): Request {
  return { body } as Request;
}

const mockRes = {} as Response;
const mockNext = vi.fn() as NextFunction;

describe('sanitizeBody middleware', () => {
  it('strips script tags from strings', () => {
    const req = createReqWithBody({
      title: 'Hello <script>alert("xss")</script> World',
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.title).toBe('Hello  World');
    expect(mockNext).toHaveBeenCalled();
  });

  it('strips inline event handlers', () => {
    const req = createReqWithBody({
      description: '<img onerror="alert(1)" src="x">',
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.description).not.toContain('onerror');
  });

  it('strips javascript: URIs', () => {
    const req = createReqWithBody({
      link: 'javascript:alert(1)',
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.link).not.toContain('javascript:');
  });

  it('handles nested objects', () => {
    const req = createReqWithBody({
      data: {
        nested: '<script>bad</script>clean',
      },
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.data.nested).toBe('clean');
  });

  it('handles arrays', () => {
    const req = createReqWithBody({
      items: ['<script>x</script>safe', 'normal'],
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.items[0]).toBe('safe');
    expect(req.body.items[1]).toBe('normal');
  });

  it('passes through non-string values', () => {
    const req = createReqWithBody({
      count: 42,
      active: true,
      nullable: null,
    });
    sanitizeBody(req, mockRes, mockNext);
    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
    expect(req.body.nullable).toBeNull();
  });

  it('calls next()', () => {
    const next = vi.fn();
    sanitizeBody(createReqWithBody({}), mockRes, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
