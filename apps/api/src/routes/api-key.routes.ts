import { Router } from 'express';
import { z } from 'zod';
import * as apiKeyController from '../controllers/api-key.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1, 'At least one scope required'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

router.get('/', apiKeyController.listApiKeys);
router.post('/', validate(createApiKeySchema), apiKeyController.createApiKey);
router.delete('/:id', apiKeyController.revokeApiKey);

export default router;
