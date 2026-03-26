import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as searchController from '../controllers/search.controller';

const router = Router();

router.get('/', authenticate, searchController.search);

export default router;
