import { Request, Response, NextFunction } from 'express';
import * as attachmentService from '../services/attachment.service';
import { AppError } from '../middleware/errorHandler';

/**
 * GET /api/attachments?issueId=xxx
 * Lists all attachments for an issue.
 */
export async function listAttachments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issueId = req.query.issueId as string | undefined;

    if (!issueId) {
      throw new AppError('issueId query parameter is required', 400);
    }

    const attachments = await attachmentService.listAttachments(issueId);

    res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/attachments
 * Uploads a file attachment to an issue.
 * Expects multipart form with field name "file" and "issueId" in the body.
 */
export async function uploadAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issueId = req.body.issueId as string | undefined;

    if (!issueId) {
      throw new AppError('issueId is required', 400);
    }

    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const attachment = await attachmentService.uploadAttachment(
      issueId,
      req.user!.userId,
      req.file,
    );

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'Attachment uploaded',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/attachments/:id
 * Deletes an attachment by ID.
 */
export async function deleteAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await attachmentService.deleteAttachment(
      req.params.id,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: null,
      message: 'Attachment deleted',
    });
  } catch (error) {
    next(error);
  }
}
