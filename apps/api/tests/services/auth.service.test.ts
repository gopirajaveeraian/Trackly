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
      findFirst: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    workspaceMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: Function) => fn({
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: null,
        }),
        update: vi.fn(),
      },
      workspace: {
        create: vi.fn().mockResolvedValue({ id: 'ws-1', name: 'Test Workspace', slug: 'test-workspace' }),
      },
      workspaceMember: {
        create: vi.fn(),
      },
    })),
  },
}));

// Mock email service
vi.mock('../../src/services/email.service', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

// Mock env
vi.mock('../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-16-chars',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-16-chars',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    CLIENT_URL: 'http://localhost:3050',
  },
}));

import { prisma } from '../../src/config/db';
import * as authService from '../../src/services/auth.service';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'existing',
        name: 'Existing',
        email: 'test@example.com',
        password: 'hashed',
        avatar: null,
        refreshToken: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should create user and return tokens on success', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.name).toBe('Test User');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        authService.login({ email: 'no@user.com', password: 'pass' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedError if password is wrong', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test',
        email: 'test@example.com',
        password: await bcrypt.hash('CorrectPassword', 12),
        avatar: null,
        refreshToken: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should return tokens and user on successful login', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword', 12);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        avatar: null,
        refreshToken: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'CorrectPassword',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as never);

      await authService.logout('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should throw if refresh token is invalid', async () => {
      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw if stored token does not match', async () => {
      const payload = { userId: 'user-1', email: 'test@example.com' };
      const token = jwt.sign(payload, 'test-refresh-secret-min-16-chars', { expiresIn: '7d' });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        refreshToken: 'different-stored-token',
      } as never);

      await expect(authService.refreshTokens(token)).rejects.toThrow(
        'Refresh token has been revoked',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return silently if user not found (prevent email enumeration)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.forgotPassword('no@user.com')).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should throw if token is invalid or expired', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });
});
