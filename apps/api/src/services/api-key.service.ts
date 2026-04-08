import crypto from 'crypto';
import { prisma } from '../config/db';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  workspaceId: string;
  expiresInDays?: number;
}

/**
 * Generates a cryptographically secure API key.
 * Format: trk_<prefix>_<random> (total ~48 chars)
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const prefix = randomBytes.substring(0, 8);
  const key = `trk_${prefix}_${randomBytes.substring(8)}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix: `trk_${prefix}`, hash };
}

/**
 * Hashes an API key for storage lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Creates a new API key for a workspace.
 * Returns the full key only once - it cannot be retrieved again.
 */
export async function createApiKey(input: CreateApiKeyInput, userId: string) {
  const { name, scopes, workspaceId, expiresInDays } = input;

  // Verify workspace membership
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  if (!['ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ForbiddenError('Only admins and project managers can create API keys');
  }

  const { key, prefix, hash } = generateApiKey();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      userId,
      workspaceId,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Return the full key only on creation
  return { ...apiKey, key };
}

/**
 * Lists all API keys for a workspace (without the actual key).
 */
export async function listApiKeys(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  return prisma.apiKey.findMany({
    where: { workspaceId, revoked: false },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revokes an API key (soft delete).
 */
export async function revokeApiKey(apiKeyId: string, userId: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { workspaceId: true },
  });

  if (!apiKey) {
    throw new NotFoundError('API Key');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: apiKey.workspaceId } },
  });

  if (!membership || !['ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ForbiddenError('Only admins and project managers can revoke API keys');
  }

  return prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revoked: true },
  });
}

/**
 * Validates an API key and returns the associated user and workspace.
 * Updates lastUsedAt timestamp.
 */
export async function validateApiKey(key: string) {
  const hash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!apiKey) return null;
  if (apiKey.revoked) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    userId: apiKey.user.id,
    email: apiKey.user.email,
    workspaceId: apiKey.workspaceId,
    scopes: apiKey.scopes,
  };
}
