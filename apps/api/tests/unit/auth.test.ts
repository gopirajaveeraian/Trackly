import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    workspaceMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      workspace: {
        create: vi.fn(),
      },
      workspaceMember: {
        create: vi.fn(),
      },
    })),
  },
}));

describe('Auth Utilities', () => {
  it('should hash passwords correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject wrong passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare('WrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should generate valid JWT tokens', () => {
    const secret = process.env.JWT_SECRET!;
    const payload = { userId: 'test-user-id', email: 'test@example.com' };
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    const decoded = jwt.verify(token, secret) as typeof payload;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should reject expired tokens', () => {
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ userId: 'test' }, secret, { expiresIn: '0s' });
    expect(() => jwt.verify(token, secret)).toThrow();
  });

  it('should reject tokens with wrong secret', () => {
    const token = jwt.sign({ userId: 'test' }, 'wrong-secret', { expiresIn: '15m' });
    expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow();
  });
});
