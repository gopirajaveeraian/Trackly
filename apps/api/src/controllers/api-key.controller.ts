import { Request, Response, NextFunction } from 'express';
import * as apiKeyService from '../services/api-key.service';

/**
 * POST /api/api-keys
 * Creates a new API key. Returns the full key only once.
 */
export async function createApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, scopes, workspaceId, expiresInDays } = req.body;
    const result = await apiKeyService.createApiKey(
      { name, scopes, workspaceId, expiresInDays },
      req.user!.userId,
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'API key created. Save the key now — it cannot be shown again.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/api-keys?workspaceId=
 * Lists all active API keys for a workspace.
 */
export async function listApiKeys(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.query.workspaceId as string;
    const keys = await apiKeyService.listApiKeys(workspaceId, req.user!.userId);

    res.status(200).json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/api-keys/:id
 * Revokes an API key.
 */
export async function revokeApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await apiKeyService.revokeApiKey(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'API key revoked' });
  } catch (error) {
    next(error);
  }
}
