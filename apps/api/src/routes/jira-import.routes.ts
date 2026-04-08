import { Router } from 'express';
import { z } from 'zod';
import * as jiraImportController from '../controllers/jira-import.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All jira-import routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const importProjectSchema = z.object({
  jiraBaseUrl: z
    .string()
    .min(1, 'Jira base URL is required')
    .url('Jira base URL must be a valid URL'),
  jiraEmail: z
    .string()
    .min(1, 'Jira email is required')
    .email('Must be a valid email address'),
  jiraApiToken: z
    .string()
    .min(1, 'Jira API token is required'),
  jiraProjectKey: z
    .string()
    .min(1, 'Jira project key is required')
    .max(20, 'Project key too long'),
  workspaceId: z
    .string()
    .uuid('Invalid workspace ID'),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.post('/', validate(importProjectSchema), jiraImportController.importProject);

export default router;
