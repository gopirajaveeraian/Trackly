import { Router } from 'express';
import { z } from 'zod';
import * as workspaceController from '../controllers/workspace.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER']),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', workspaceController.listWorkspaces);
router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/:id', workspaceController.getWorkspace);
router.put('/:id', validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.post('/:id/invite', validate(inviteMemberSchema), workspaceController.inviteMember);
router.get('/:id/members', workspaceController.listMembers);

export default router;
