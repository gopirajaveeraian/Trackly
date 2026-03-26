import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import projectRoutes from './project.routes';
import issueRoutes from './issue.routes';
import sprintRoutes from './sprint.routes';
import notificationRoutes from './notification.routes';
import attachmentRoutes from './attachment.routes';
import reportRoutes from './report.routes';
import workflowRoutes from './workflow.routes';
import searchRoutes from './search.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/issues', issueRoutes);
router.use('/sprints', sprintRoutes);
router.use('/notifications', notificationRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/reports', reportRoutes);
router.use('/workflows', workflowRoutes);
router.use('/search', searchRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
