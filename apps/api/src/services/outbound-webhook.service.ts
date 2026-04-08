import crypto from 'crypto';
import { prisma } from '../config/db';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  workspaceId: string;
}

interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  enabled?: boolean;
}

/**
 * All supported webhook event types.
 */
export const WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'issue.status_changed',
  'issue.assigned',
  'comment.created',
  'sprint.started',
  'sprint.completed',
  'project.created',
  'project.updated',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Creates a new outbound webhook for a workspace.
 */
export async function createWebhook(input: CreateWebhookInput, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: input.workspaceId } },
  });

  if (!membership || !['ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ForbiddenError('Only admins and project managers can create webhooks');
  }

  return prisma.outboundWebhook.create({
    data: {
      name: input.name,
      url: input.url,
      secret: input.secret ?? null,
      events: input.events,
      workspaceId: input.workspaceId,
    },
  });
}

/**
 * Lists all outbound webhooks for a workspace.
 */
export async function listWebhooks(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  return prisma.outboundWebhook.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates an outbound webhook.
 */
export async function updateWebhook(
  webhookId: string,
  userId: string,
  data: UpdateWebhookInput,
) {
  const webhook = await prisma.outboundWebhook.findUnique({
    where: { id: webhookId },
    select: { workspaceId: true },
  });

  if (!webhook) throw new NotFoundError('Webhook');

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: webhook.workspaceId } },
  });

  if (!membership || !['ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ForbiddenError('Only admins and project managers can update webhooks');
  }

  return prisma.outboundWebhook.update({
    where: { id: webhookId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.secret !== undefined && { secret: data.secret }),
      ...(data.events !== undefined && { events: data.events }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
}

/**
 * Deletes an outbound webhook.
 */
export async function deleteWebhook(webhookId: string, userId: string) {
  const webhook = await prisma.outboundWebhook.findUnique({
    where: { id: webhookId },
    select: { workspaceId: true },
  });

  if (!webhook) throw new NotFoundError('Webhook');

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: webhook.workspaceId } },
  });

  if (!membership || !['ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ForbiddenError('Only admins and project managers can delete webhooks');
  }

  return prisma.outboundWebhook.delete({ where: { id: webhookId } });
}

/**
 * Generates an HMAC-SHA256 signature for a webhook payload.
 */
function signPayload(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatches a webhook event to all registered endpoints for a workspace.
 * Runs asynchronously (fire-and-forget) to not block the main request.
 */
export async function dispatchWebhookEvent(
  workspaceId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.outboundWebhook.findMany({
    where: {
      workspaceId,
      enabled: true,
    },
  });

  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  });

  for (const webhook of webhooks) {
    // Check if this webhook is subscribed to this event
    if (!webhook.events.includes(event)) continue;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Trackly-Event': event,
      'X-Trackly-Delivery': crypto.randomUUID(),
    };

    if (webhook.secret) {
      headers['X-Trackly-Signature'] = signPayload(payload, webhook.secret);
    }

    // Fire-and-forget: don't await, don't block
    fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000),
    }).catch((err) => {
      console.error(`[Webhook] Failed to deliver to ${webhook.url}: ${err.message}`);
    });
  }
}
