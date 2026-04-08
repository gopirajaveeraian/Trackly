import { Router } from 'express';
import { z } from 'zod';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';

const router = Router();

// All report routes require authentication
router.use(authenticate);

const sprintQuerySchema = z.object({
  sprintId: z.string().uuid('Invalid sprint ID'),
});

const projectQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

router.get('/burndown', validateQuery(sprintQuerySchema), reportController.getBurndown);
router.get('/velocity', validateQuery(projectQuerySchema), reportController.getVelocity);
router.get('/workload', validateQuery(projectQuerySchema), reportController.getWorkload);
router.get('/status-summary', validateQuery(projectQuerySchema), reportController.getStatusSummary);
router.get('/sprint-health', validateQuery(sprintQuerySchema), reportController.sprintHealth);
router.get('/burnup', validateQuery(sprintQuerySchema), reportController.burnup);

export default router;
