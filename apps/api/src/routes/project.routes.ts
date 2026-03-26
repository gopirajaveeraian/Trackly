import { Router } from 'express';
import { z } from 'zod';
import * as projectController from '../controllers/project.controller';
import * as issueController from '../controllers/issue.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(10)
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Key must start with a letter and contain only alphanumeric characters'),
  type: z.enum(['SCRUM', 'KANBAN']),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum(['SCRUM', 'KANBAN']).optional(),
});

const createStatusSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  order: z.number().int().min(0),
});

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', projectController.listProjects);
router.post('/', validate(createProjectSchema), projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/statuses', projectController.getStatuses);
router.post('/:id/statuses', validate(createStatusSchema), projectController.createStatus);

// Labels
router.get('/:projectId/labels', issueController.listLabels);
router.post('/:projectId/labels', validate(createLabelSchema), issueController.createLabel);
router.delete('/:projectId/labels/:labelId', issueController.deleteLabel);

export default router;
