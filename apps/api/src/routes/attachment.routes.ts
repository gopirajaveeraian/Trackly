import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import * as attachmentController from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All attachment routes require authentication
router.use(authenticate);

// ─── Multer Configuration ────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get('/', attachmentController.listAttachments);
router.post('/', upload.single('file'), attachmentController.uploadAttachment);
router.delete('/:id', attachmentController.deleteAttachment);

export default router;
