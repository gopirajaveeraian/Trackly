import { Router } from 'express';
import { z } from 'zod';
import * as webhookController from '../controllers/outbound-webhook.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Must be a valid URL'),
  secret: z.string().max(256).optional(),
  events: z.array(z.string()).min(1, 'At least one event required'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  secret: z.string().max(256).optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

router.get('/events', webhookController.listEvents);
router.get('/', webhookController.listWebhooks);
router.post('/', validate(createWebhookSchema), webhookController.createWebhook);
router.put('/:id', validate(updateWebhookSchema), webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);

export default router;
