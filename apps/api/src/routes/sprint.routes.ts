import { Router } from 'express';
import { z } from 'zod';
import * as sprintController from '../controllers/sprint.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All sprint routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createSprintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().uuid('Invalid project ID'),
});

const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', sprintController.listSprints);
router.post('/', validate(createSprintSchema), sprintController.createSprint);
router.get('/:id', sprintController.getSprint);
router.put('/:id', validate(updateSprintSchema), sprintController.updateSprint);
router.post('/:id/start', sprintController.startSprint);
router.post('/:id/complete', sprintController.completeSprint);

export default router;
