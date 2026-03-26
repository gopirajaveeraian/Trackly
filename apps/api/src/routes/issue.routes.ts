import { Router } from 'express';
import { z } from 'zod';
import * as issueController from '../controllers/issue.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All issue routes require authentication
router.use(authenticate);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10000).optional(),
  type: z.enum(['BUG', 'STORY', 'TASK', 'EPIC', 'SUBTASK']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  statusId: z.string().uuid('Invalid status ID'),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  sprintId: z.string().uuid('Invalid sprint ID').optional(),
  epicId: z.string().uuid('Invalid epic ID').optional(),
  dueDate: z.string().datetime().optional(),
  storyPoints: z.number().min(0).max(100).optional(),
  estimate: z.number().min(0).max(10000).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(['BUG', 'STORY', 'TASK', 'EPIC', 'SUBTASK']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  statusId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  epicId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  estimate: z.number().min(0).max(10000).nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

const updateStatusSchema = z.object({
  statusId: z.string().uuid('Invalid status ID'),
});

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(10000),
});

const addLinkSchema = z.object({
  type: z.enum(['BLOCKS', 'IS_BLOCKED_BY', 'RELATES_TO', 'DUPLICATES']),
  targetIssueId: z.string().uuid('Invalid target issue ID'),
});

const addWatcherSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const addTimeLogSchema = z.object({
  hours: z.number().min(0.01).max(24),
  description: z.string().max(500).optional(),
  loggedAt: z.string().datetime().optional(),
});

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get('/', issueController.listIssues);
router.post('/', validate(createIssueSchema), issueController.createIssue);
router.get('/:id', issueController.getIssue);
router.put('/:id', validate(updateIssueSchema), issueController.updateIssue);
router.delete('/:id', issueController.deleteIssue);
router.patch('/:id/status', validate(updateStatusSchema), issueController.updateStatus);
router.patch('/:id/reorder', validate(z.object({
  previousOrder: z.number().nullable(),
  nextOrder: z.number().nullable(),
})), issueController.reorderIssue);
router.post('/:id/comments', validate(addCommentSchema), issueController.addComment);
router.get('/:id/comments', issueController.listComments);
router.get('/:id/activity', issueController.getActivity);

// Issue links
router.post('/:id/links', validate(addLinkSchema), issueController.addLink);
router.delete('/:id/links/:linkId', issueController.removeLink);

// Watchers
router.post('/:id/watchers', validate(addWatcherSchema), issueController.addWatcher);
router.delete('/:id/watchers/:userId', issueController.removeWatcher);

// Time logs
router.post('/:id/time-logs', validate(addTimeLogSchema), issueController.addTimeLog);
router.delete('/:id/time-logs/:timeLogId', issueController.removeTimeLog);

export default router;
