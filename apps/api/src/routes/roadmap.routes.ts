import { Router } from 'express';
import { z } from 'zod';
import * as roadmapController from '../controllers/roadmap.controller';
import { authenticate } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';

const router = Router();

router.use(authenticate);

const roadmapQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

router.get('/', validateQuery(roadmapQuerySchema), roadmapController.getRoadmap);

export default router;
