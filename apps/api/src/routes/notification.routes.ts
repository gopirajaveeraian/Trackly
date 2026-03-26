import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// ─── Routes ─────────────────────────────────────────────────────────────────

// NOTE: Static routes must come before parameterized routes
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);

router.get('/', notificationController.listNotifications);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
