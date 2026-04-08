import { Router } from 'express';
import { z } from 'zod';
import * as capacityController from '../controllers/capacity.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All capacity routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const upsertCapacitySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  sprintId: z.string().uuid('Invalid sprint ID'),
  availableHours: z.number().min(0, 'Available hours must be non-negative').max(999),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', capacityController.listCapacities);
router.post('/', validate(upsertCapacitySchema), capacityController.upsertCapacity);

export default router;
