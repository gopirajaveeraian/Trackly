import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler';
import type { JwtPayload } from '../middleware/auth';
import * as emailService from './email.service';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

/**
 * Generates a JWT access token for the given user.
 */
function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string & { __brand: 'StringValue' },
  } as jwt.SignOptions);
}

/**
 * Generates a JWT refresh token for the given user.
 */
function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as string & { __brand: 'StringValue' },
  } as jwt.SignOptions);
}

/**
 * Generates an access/refresh token pair for a user.
 */
function generateTokenPair(userId: string, email: string): AuthTokens {
  const payload: JwtPayload = { userId, email };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Creates a URL-safe slug from a string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Registers a new user account.
 * Validates that the email is not already taken, hashes the password,
 * creates the user and a default personal workspace within a transaction.
 *
 * @param input - Registration data (name, email, password)
 * @returns Authentication result with tokens and user info
 * @throws ConflictError if email already exists
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const { name, email, password } = input;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const tokens = generateTokenPair(crypto.randomUUID(), email);

  // Create user and default workspace in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        refreshToken: tokens.refreshToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    // Re-generate tokens with the actual user ID
    const finalTokens = generateTokenPair(user.id, user.email);

    // Update refreshToken with the correct one
    await tx.user.update({
      where: { id: user.id },
      data: { refreshToken: finalTokens.refreshToken },
    });

    // Create default workspace
    const slug = slugify(`${name}-workspace-${Date.now()}`);
    const workspace = await tx.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug,
      },
    });

    // Add user as ADMIN of the workspace
    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'ADMIN',
      },
    });

    return { user, tokens: finalTokens };
  });

  return {
    ...result.tokens,
    user: result.user,
  };
}

/**
 * Authenticates a user with email and password.
 * Verifies credentials, generates new token pair, and stores the refresh token.
 *
 * @param input - Login credentials (email, password)
 * @returns Authentication result with tokens and user info
 * @throws UnauthorizedError if credentials are invalid
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      password: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = generateTokenPair(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  };
}

/**
 * Logs out a user by clearing their stored refresh token.
 *
 * @param userId - The ID of the user to log out
 */
export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

/**
 * Refreshes an expired access token using a valid refresh token.
 * Verifies the refresh token, checks it matches the stored one,
 * then generates a new token pair (rotation for security).
 *
 * @param refreshToken - The refresh token to verify
 * @returns New authentication tokens
 * @throws UnauthorizedError if refresh token is invalid or revoked
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, refreshToken: true },
  });

  if (!user || user.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  const tokens = generateTokenPair(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return tokens;
}

/**
 * Initiates the forgot-password flow.
 * Generates a reset token with an expiry, stores it on the user record,
 * and (in production) sends a reset email.
 *
 * @param email - The email of the user requesting a password reset
 * @throws NotFoundError if no user with that email exists
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!user) {
    // Return silently to avoid email enumeration
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry,
    },
  });

  // Log the reset token in development for debugging
  if (env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  }

  // Send password reset email (fire-and-forget)
  emailService.sendPasswordResetEmail(
    email,
    user.name,
    `${env.CLIENT_URL}/reset-password?token=${resetToken}`,
  );
}

/**
 * Resets a user's password using a valid reset token.
 * Hashes the token, finds the matching user with a non-expired token,
 * then updates the password and clears the reset fields.
 *
 * @param token - The plaintext reset token (from email link)
 * @param newPassword - The new password to set
 * @throws AppError if token is invalid or expired
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
    select: { id: true },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      refreshToken: null, // Invalidate existing sessions
    },
  });
}
