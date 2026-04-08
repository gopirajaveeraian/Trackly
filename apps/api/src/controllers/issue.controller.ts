import { Request, Response, NextFunction } from 'express';
import { IssueType, Priority, IssueLinkType } from '@prisma/client';
import * as issueService from '../services/issue.service';
import { prisma } from '../config/db';
import { dispatchWebhookEvent } from '../services/outbound-webhook.service';

/**
 * GET /api/issues
 * Lists issues with optional filters and cursor-based pagination.
 */
export async function listIssues(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await issueService.listIssues(
      {
        projectId: req.query.projectId as string | undefined,
        sprintId: req.query.sprintId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        assigneeId: req.query.assigneeId as string | undefined,
        type: req.query.type as IssueType | undefined,
        priority: req.query.priority as Priority | undefined,
        search: req.query.search as string | undefined,
        cursor: req.query.cursor as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      },
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/issues
 * Creates a new issue.
 */
export async function createIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issue = await issueService.createIssue(req.body, req.user!.userId);

    const io = req.app.locals.io;
    if (io && issue.projectId) {
      io.to(`project:${issue.projectId}`).emit('issue:created', issue);
    }

    // Dispatch outbound webhook
    const project = await prisma.project.findUnique({
      where: { id: issue.projectId },
      select: { workspaceId: true, key: true },
    });
    if (project) {
      dispatchWebhookEvent(project.workspaceId, 'issue.created', {
        issue: { ...issue, key: `${project.key}-${issue.number}` },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: issue,
      message: 'Issue created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/issues/:id
 * Gets issue details with all relations.
 */
export async function getIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issue = await issueService.getIssue(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/issues/:id
 * Updates an issue.
 */
export async function updateIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issue = await issueService.updateIssue(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    const io = req.app.locals.io;
    if (io && issue.projectId) {
      io.to(`project:${issue.projectId}`).emit('issue:updated', issue);
    }

    // Dispatch outbound webhook
    const proj = await prisma.project.findUnique({
      where: { id: issue.projectId },
      select: { workspaceId: true, key: true },
    });
    if (proj) {
      const eventType = req.body.assigneeId !== undefined ? 'issue.assigned' : 'issue.updated';
      dispatchWebhookEvent(proj.workspaceId, eventType, {
        issue: { ...issue, key: `${proj.key}-${issue.number}` },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      data: issue,
      message: 'Issue updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/issues/:id
 * Deletes an issue.
 */
export async function deleteIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get projectId before deletion for socket emission
    const issueToDelete = await prisma.issue.findUnique({
      where: { id: req.params.id },
      select: { projectId: true },
    });

    await issueService.deleteIssue(req.params.id, req.user!.userId);

    const io = req.app.locals.io;
    if (io && issueToDelete?.projectId) {
      io.to(`project:${issueToDelete.projectId}`).emit('issue:deleted', { issueId: req.params.id });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Issue deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/issues/:id/status
 * Updates issue status (for drag-and-drop between columns).
 */
export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { statusId } = req.body as { statusId: string };
    const issue = await issueService.updateIssueStatus(
      req.params.id,
      req.user!.userId,
      statusId,
    );

    const io = req.app.locals.io;
    if (io && issue.projectId) {
      io.to(`project:${issue.projectId}`).emit('issue:status-changed', {
        issueId: issue.id,
        statusId: req.body.statusId,
        issue,
      });
    }

    res.status(200).json({
      success: true,
      data: issue,
      message: 'Status updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/issues/:id/comments
 * Adds a comment to an issue.
 */
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { content } = req.body as { content: string };
    const comment = await issueService.addComment(
      req.params.id,
      req.user!.userId,
      content,
    );

    const io = req.app.locals.io;
    if (io) {
      // We need the projectId - get it from the issue
      const commentIssue = await prisma.issue.findUnique({
        where: { id: req.params.id },
        select: { projectId: true },
      });
      if (commentIssue) {
        io.to(`project:${commentIssue.projectId}`).emit('issue:comment-added', {
          issueId: req.params.id,
          comment,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment added',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/issues/:id/comments
 * Lists comments on an issue.
 */
export async function listComments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await issueService.listComments(
      req.params.id,
      req.user!.userId,
      req.query.cursor as string | undefined,
      req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    );

    res.status(200).json({
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/issues/:id/activity
 * Gets activity log for an issue.
 */
export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await issueService.getActivityLog(
      req.params.id,
      req.user!.userId,
      req.query.cursor as string | undefined,
      req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    );

    res.status(200).json({
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Issue Links ────────────────────────────────────────────────────────────

export async function addLink(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type, targetIssueId } = req.body as { type: IssueLinkType; targetIssueId: string };
    const link = await issueService.addIssueLink(
      req.params.id,
      req.user!.userId,
      type,
      targetIssueId,
    );
    res.status(201).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
}

export async function removeLink(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await issueService.removeIssueLink(req.params.linkId, req.user!.userId);
    res.status(200).json({ success: true, data: null, message: 'Link removed' });
  } catch (error) {
    next(error);
  }
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export async function listLabels(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const labels = await issueService.listLabels(
      req.params.projectId,
      req.user!.userId,
    );
    res.status(200).json({ success: true, data: labels });
  } catch (error) {
    next(error);
  }
}

export async function createLabel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, color } = req.body as { name: string; color: string };
    const label = await issueService.createLabel(
      req.params.projectId,
      req.user!.userId,
      name,
      color,
    );
    res.status(201).json({ success: true, data: label });
  } catch (error) {
    next(error);
  }
}

export async function deleteLabel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await issueService.deleteLabel(req.params.labelId, req.user!.userId);
    res.status(200).json({ success: true, data: null, message: 'Label deleted' });
  } catch (error) {
    next(error);
  }
}

// ─── Watchers ───────────────────────────────────────────────────────────────

export async function addWatcher(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId: watchUserId } = req.body as { userId: string };
    const watcher = await issueService.addWatcher(
      req.params.id,
      req.user!.userId,
      watchUserId,
    );
    res.status(201).json({ success: true, data: watcher });
  } catch (error) {
    next(error);
  }
}

export async function removeWatcher(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await issueService.removeWatcher(
      req.params.id,
      req.user!.userId,
      req.params.userId,
    );
    res.status(200).json({ success: true, data: null, message: 'Watcher removed' });
  } catch (error) {
    next(error);
  }
}

// ─── Time Logs ──────────────────────────────────────────────────────────────

export async function addTimeLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { hours, description, loggedAt } = req.body as {
      hours: number;
      description?: string;
      loggedAt?: string;
    };
    const timeLog = await issueService.addTimeLog(
      req.params.id,
      req.user!.userId,
      hours,
      description,
      loggedAt,
    );
    res.status(201).json({ success: true, data: timeLog });
  } catch (error) {
    next(error);
  }
}

export async function removeTimeLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await issueService.removeTimeLog(req.params.timeLogId, req.user!.userId);
    res.status(200).json({ success: true, data: null, message: 'Time log removed' });
  } catch (error) {
    next(error);
  }
}

// ─── Reorder ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/issues/:id/reorder
 * Reorders an issue within the backlog or board column.
 */
export async function reorderIssue(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { previousOrder, nextOrder } = req.body as {
      previousOrder: number | null;
      nextOrder: number | null;
    };
    const issue = await issueService.reorderIssue(
      req.params.id,
      req.user!.userId,
      previousOrder ?? null,
      nextOrder ?? null,
    );
    res.status(200).json({ success: true, data: issue, message: 'Issue reordered' });
  } catch (error) {
    next(error);
  }
}
