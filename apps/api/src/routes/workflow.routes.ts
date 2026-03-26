import { Router } from 'express';
import { z } from 'zod';
import * as workflowController from '../controllers/workflow.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const addTransitionSchema = z.object({
  fromStatusId: z.string().uuid(),
  toStatusId: z.string().uuid(),
});

router.get('/:projectId/transitions', workflowController.listTransitions);
router.get('/:projectId/transitions/from/:statusId', workflowController.getAllowedTransitions);
router.post('/:projectId/transitions', validate(addTransitionSchema), workflowController.addTransition);
router.delete('/transitions/:transitionId', workflowController.removeTransition);

export default router;
