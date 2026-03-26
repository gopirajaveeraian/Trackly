import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';

/**
 * Lists all attachments for a given issue.
 *
 * @param issueId - The issue ID
 * @returns Array of attachments ordered by most recent first
 */
export async function listAttachments(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  return prisma.attachment.findMany({
    where: { issueId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Uploads a file attachment and creates a database record.
 *
 * @param issueId - The issue ID to attach the file to
 * @param userId - The ID of the uploading user
 * @param file - The multer file object
 * @returns The created attachment record
 */
export async function uploadAttachment(
  issueId: string,
  userId: string,
  file: Express.Multer.File,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true },
  });

  if (!issue) {
    // Clean up uploaded file if issue doesn't exist
    fs.unlink(file.path, () => {});
    throw new NotFoundError('Issue');
  }

  const url = `/api/uploads/${file.filename}`;

  return prisma.attachment.create({
    data: {
      filename: file.originalname,
      url,
      issueId,
      uploadedById: userId,
    },
  });
}

/**
 * Deletes an attachment file and its database record.
 * Only the user who uploaded the attachment can delete it.
 *
 * @param attachmentId - The attachment ID to delete
 * @param userId - The requesting user's ID (must be the uploader)
 */
export async function deleteAttachment(
  attachmentId: string,
  userId: string,
): Promise<void> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new NotFoundError('Attachment');
  }

  if (attachment.uploadedById !== userId) {
    throw new ForbiddenError('You can only delete your own attachments');
  }

  // Extract filename from the URL and delete the file from disk
  const filename = path.basename(attachment.url);
  const filePath = path.join(__dirname, '../../uploads', filename);

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  // Remove file from disk (non-blocking, ignore errors if file is already gone)
  fs.unlink(filePath, () => {});
}
