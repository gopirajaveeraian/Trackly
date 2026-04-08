import { Router } from 'express';
import { z } from 'zod';
import * as releaseController from '../controllers/release.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All release routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createReleaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime().optional(),
  releaseDate: z.string().datetime().optional(),
  projectId: z.string().uuid('Invalid project ID'),
});

const updateReleaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'RELEASED', 'ARCHIVED']).optional(),
  startDate: z.string().datetime().optional(),
  releaseDate: z.string().datetime().optional(),
});

const addIssueSchema = z.object({
  issueId: z.string().uuid('Invalid issue ID'),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', releaseController.listReleases);
router.post('/', validate(createReleaseSchema), releaseController.createRelease);
router.get('/:id', releaseController.getRelease);
router.put('/:id', validate(updateReleaseSchema), releaseController.updateRelease);
router.delete('/:id', releaseController.deleteRelease);
router.post('/:id/issues', validate(addIssueSchema), releaseController.addIssueToRelease);
router.delete('/:id/issues/:issueId', releaseController.removeIssueFromRelease);

export default router;
