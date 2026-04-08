import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import * as searchController from '../controllers/search.controller';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

router.get('/', authenticate, validateQuery(searchQuerySchema), searchController.search);

export default router;
