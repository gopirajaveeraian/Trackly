import { Request, Response, NextFunction } from 'express';
import * as webhookService from '../services/outbound-webhook.service';

/**
 * POST /api/outbound-webhooks
 */
export async function createWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const webhook = await webhookService.createWebhook(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/outbound-webhooks?workspaceId=
 */
export async function listWebhooks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.query.workspaceId as string;
    const webhooks = await webhookService.listWebhooks(workspaceId, req.user!.userId);
    res.status(200).json({ success: true, data: webhooks });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/outbound-webhooks/:id
 */
export async function updateWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const webhook = await webhookService.updateWebhook(
      req.params.id,
      req.user!.userId,
      req.body,
    );
    res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/outbound-webhooks/:id
 */
export async function deleteWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await webhookService.deleteWebhook(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/outbound-webhooks/events
 * Returns all supported webhook event types.
 */
export async function listEvents(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(200).json({
    success: true,
    data: webhookService.WEBHOOK_EVENTS,
  });
}
