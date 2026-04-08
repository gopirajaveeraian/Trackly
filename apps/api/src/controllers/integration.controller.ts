import { Request, Response, NextFunction } from 'express';
import * as integrationService from '../services/integration.service';

/**
 * GET /api/integrations?workspaceId=
 * Lists all integrations for a workspace.
 */
export async function listIntegrations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.query.workspaceId as string;
    const integrations = await integrationService.listIntegrations(
      workspaceId,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations
 * Creates a new integration.
 */
export async function createIntegration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const integration = await integrationService.createIntegration(
      req.body,
      req.user!.userId,
    );

    res.status(201).json({
      success: true,
      data: integration,
      message: 'Integration created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/integrations/:id
 * Updates an integration.
 */
export async function updateIntegration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const integration = await integrationService.updateIntegration(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: integration,
      message: 'Integration updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/integrations/:id
 * Deletes an integration.
 */
export async function deleteIntegration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await integrationService.deleteIntegration(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      message: 'Integration deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/:id/test
 * Tests the connection for an integration.
 */
export async function testConnection(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await integrationService.testConnection(
      req.params.id,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
