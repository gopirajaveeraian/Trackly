import { Router } from 'express';
import { z } from 'zod';
import * as integrationController from '../controllers/integration.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All integration routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createIntegrationSchema = z.object({
  type: z.enum(['GITHUB', 'CONFLUENCE', 'SLACK', 'JIRA', 'BITBUCKET', 'GITLAB']),
  name: z.string().min(1, 'Name is required').max(100),
  config: z.record(z.string()).default({}),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.string()).optional(),
  enabled: z.boolean().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', integrationController.listIntegrations);
router.post('/', validate(createIntegrationSchema), integrationController.createIntegration);
router.put('/:id', validate(updateIntegrationSchema), integrationController.updateIntegration);
router.delete('/:id', integrationController.deleteIntegration);
router.post('/:id/test', integrationController.testConnection);

export default router;
