import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All report routes require authentication
router.use(authenticate);

router.get('/burndown', reportController.getBurndown);
router.get('/velocity', reportController.getVelocity);
router.get('/workload', reportController.getWorkload);
router.get('/status-summary', reportController.getStatusSummary);

export default router;
