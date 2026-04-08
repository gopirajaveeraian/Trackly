import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { processGitHubWebhook, verifyGitHubSignature } from '../services/github-webhook.service';
import { AppError } from '../middleware/errorHandler';

/**
 * POST /api/webhooks/github
 * Receives GitHub webhook events and processes them.
 */
export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const event = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const deliveryId = req.headers['x-github-delivery'] as string;

    if (!event) {
      throw new AppError('Missing X-GitHub-Event header', 400);
    }

    // Find GitHub integrations to get the webhook secret
    const integrations = await prisma.integration.findMany({
      where: { type: 'GITHUB', enabled: true },
    });

    // Verify signature if any integration has a webhook secret configured
    if (signature) {
      let verified = false;
      for (const integration of integrations) {
        const config = integration.config as Record<string, string>;
        const secret = config.webhookSecret;
        if (secret) {
          const rawBody = JSON.stringify(req.body);
          if (verifyGitHubSignature(rawBody, signature, secret)) {
            verified = true;
            break;
          }
        }
      }
      if (!verified && integrations.length > 0) {
        console.warn(`[Webhook] GitHub signature verification failed for delivery ${deliveryId}`);
      }
    }

    console.log(`[Webhook] GitHub event: ${event}, delivery: ${deliveryId}`);

    const result = await processGitHubWebhook(event, req.body);

    if (result.linkedIssues.length > 0) {
      console.log(`[Webhook] Linked issues: ${result.linkedIssues.join(', ')}`);
    }

    res.status(200).json({
      success: true,
      data: {
        event,
        processed: result.processed,
        linkedIssues: result.linkedIssues,
      },
    });
  } catch (error) {
    next(error);
  }
}
