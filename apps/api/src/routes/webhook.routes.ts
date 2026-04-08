import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

// Webhook routes don't require authentication - they use signature verification
router.post('/github', webhookController.handleGitHubWebhook);

export default router;
