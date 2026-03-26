import { prisma } from '../config/db';
import { IssueType, Priority, IssueLinkType, Prisma } from '@prisma/client';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { validateTransition } from './workflow.service';
import * as emailService from './email.service';
import { env } from '../config/env';

interface CreateIssueInput {
  title: string;
  description?: string;
  type: IssueType;
  priority: Priority;
  statusId: string;
  projectId: string;
  assigneeId?: string;
  sprintId?: string;
  epicId?: string;
  dueDate?: string;
  storyPoints?: number;
  estimate?: number;
  labelIds?: string[];
}

interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: Priority;
  statusId?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  epicId?: string | null;
  dueDate?: string | null;
  storyPoints?: number | null;
  estimate?: number | null;
  labelIds?: string[];
}

interface IssueFilters {
  projectId?: string;
  sprintId?: string;
  statusId?: string;
  assigneeId?: string;
  type?: IssueType;
  priority?: Priority;
  search?: string;
  cursor?: string;
  limit?: number;
}

/** Select clause for user relations to avoid exposing passwords. */
const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

/**
 * Verifies workspace membership via a project ID.
 */
async function verifyProjectAccess(projectId: string, userId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: project.workspaceId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You do not have access to this project');
  }

  return project.workspaceId;
}

/**
 * Lists issues with filtering, search, and cursor-based pagination.
 *
 * @param filters - Filter criteria and pagination params
 * @param userId - The requesting user's ID
 * @returns Paginated list of issues
 */
export async function listIssues(filters: IssueFilters, userId: string) {
  const {
    projectId,
    sprintId,
    statusId,
    assigneeId,
    type,
    priority,
    search,
    cursor,
    limit = 50,
  } = filters;

  if (projectId) {
    await verifyProjectAccess(projectId, userId);
  }

  const where: Prisma.IssueWhereInput = {};

  if (projectId) where.projectId = projectId;
  if (sprintId) where.sprintId = sprintId;
  if (statusId) where.statusId = statusId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const take = Math.min(limit, 100);

  const issues = await prisma.issue.findMany({
    where,
    include: {
      status: true,
      assignee: { select: userSelect },
      reporter: { select: userSelect },
      project: { select: { id: true, name: true, key: true } },
      _count: { select: { comments: true, attachments: true, subTasks: true } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: take + 1, // Fetch one extra to determine if there are more
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = issues.length > take;
  const data = hasMore ? issues.slice(0, take) : issues;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return {
    data,
    hasMore,
    nextCursor,
  };
}

/**
 * Creates a new issue with auto-generated issue number.
 * The issue number is derived from the project key (e.g., TRK-1, TRK-2).
 *
 * @param input - Issue creation data
 * @param reporterId - The ID of the user creating the issue
 * @returns The created issue with all relations
 */
export async function createIssue(input: CreateIssueInput, reporterId: string) {
  const {
    title,
    description,
    type,
    priority,
    statusId,
    projectId,
    assigneeId,
    sprintId,
    epicId,
    dueDate,
    storyPoints,
    estimate,
    labelIds,
  } = input;

  await verifyProjectAccess(projectId, reporterId);

  return prisma.$transaction(async (tx) => {
    // Get the next issue number for this project
    const lastIssue = await tx.issue.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = (lastIssue?.number ?? 0) + 1;

    const issue = await tx.issue.create({
      data: {
        title,
        description,
        type,
        priority,
        number: nextNumber,
        statusId,
        projectId,
        assigneeId,
        reporterId,
        sprintId,
        epicId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        storyPoints: storyPoints ?? undefined,
        estimate: estimate ?? undefined,
        ...(labelIds && labelIds.length > 0
          ? {
              labels: {
                create: labelIds.map((labelId) => ({ labelId })),
              },
            }
          : {}),
      },
      include: {
        status: true,
        assignee: { select: userSelect },
        reporter: { select: userSelect },
        project: { select: { id: true, name: true, key: true } },
      },
    });

    // Create activity log entry for creation
    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        issueId: issue.id,
        userId: reporterId,
      },
    });

    // Create notification if assigned to someone other than reporter
    if (assigneeId && assigneeId !== reporterId) {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { key: true },
      });

      await tx.notification.create({
        data: {
          type: 'ASSIGNED',
          message: `You were assigned to ${project?.key}-${nextNumber}: ${title}`,
          userId: assigneeId,
          issueId: issue.id,
        },
      });

      // Send email notification to assignee (fire-and-forget)
      const assigneeUser = await tx.user.findUnique({
        where: { id: assigneeId },
        select: { email: true, name: true },
      });
      const reporterUser = await tx.user.findUnique({
        where: { id: reporterId },
        select: { name: true },
      });
      if (assigneeUser) {
        emailService.sendAssignmentEmail(
          assigneeUser.email,
          assigneeUser.name,
          `${project?.key}-${nextNumber}`,
          title,
          reporterUser?.name ?? 'Someone',
          `${env.CLIENT_URL}/issues/${issue.id}`,
        );
      }
    }

    return issue;
  });
}

/**
 * Retrieves a single issue with all its relations.
 *
 * @param issueId - The issue ID
 * @param userId - The requesting user's ID
 * @returns Issue with status, assignee, reporter, comments, and activity
 * @throws NotFoundError if the issue doesn't exist
 */
export async function getIssue(issueId: string, userId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      status: true,
      assignee: { select: userSelect },
      reporter: { select: userSelect },
      project: { select: { id: true, name: true, key: true } },
      sprint: { select: { id: true, name: true, status: true } },
      epic: { select: { id: true, title: true, number: true } },
      subTasks: {
        include: {
          status: true,
          assignee: { select: userSelect },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      labels: {
        include: {
          label: true,
        },
      },
      outgoingLinks: {
        include: {
          targetIssue: {
            include: {
              status: true,
              project: { select: { key: true } },
            },
          },
        },
      },
      incomingLinks: {
        include: {
          sourceIssue: {
            include: {
              status: true,
              project: { select: { key: true } },
            },
          },
        },
      },
      watchers: {
        include: {
          user: { select: userSelect },
        },
      },
      timeLogs: {
        include: {
          user: { select: userSelect },
        },
        orderBy: { loggedAt: 'desc' },
      },
      _count: { select: { comments: true } },
    },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, userId);

  // Normalize links into a flat array with linkedIssue
  const outgoing = issue.outgoingLinks.map((link) => ({
    id: link.id,
    type: link.type,
    sourceIssueId: link.sourceIssueId,
    targetIssueId: link.targetIssueId,
    linkedIssue: {
      id: link.targetIssue.id,
      title: link.targetIssue.title,
      number: link.targetIssue.number,
      type: link.targetIssue.type,
      priority: link.targetIssue.priority,
      status: link.targetIssue.status,
      project: link.targetIssue.project,
    },
    createdAt: link.createdAt,
  }));

  const incoming = issue.incomingLinks.map((link) => ({
    id: link.id,
    type: link.type === 'BLOCKS' ? 'IS_BLOCKED_BY' as const : link.type,
    sourceIssueId: link.sourceIssueId,
    targetIssueId: link.targetIssueId,
    linkedIssue: {
      id: link.sourceIssue.id,
      title: link.sourceIssue.title,
      number: link.sourceIssue.number,
      type: link.sourceIssue.type,
      priority: link.sourceIssue.priority,
      status: link.sourceIssue.status,
      project: link.sourceIssue.project,
    },
    createdAt: link.createdAt,
  }));

  const labels = issue.labels.map((il) => il.label);

  return {
    ...issue,
    labels,
    links: [...outgoing, ...incoming],
    outgoingLinks: undefined,
    incomingLinks: undefined,
  };
}

/**
 * Updates an issue and creates activity log entries for each changed field.
 *
 * @param issueId - The issue ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns The updated issue
 */
export async function updateIssue(
  issueId: string,
  userId: string,
  data: UpdateIssueInput,
) {
  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      status: true,
      project: { select: { key: true } },
    },
  });

  if (!existing) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(existing.projectId, userId);

  return prisma.$transaction(async (tx) => {
    // Build activity log entries for changed fields
    const activities: Array<{
      action: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      issueId: string;
      userId: string;
    }> = [];

    if (data.title !== undefined && data.title !== existing.title) {
      activities.push({
        action: 'UPDATED',
        field: 'title',
        oldValue: existing.title,
        newValue: data.title,
        issueId,
        userId,
      });
    }

    if (data.type !== undefined && data.type !== existing.type) {
      activities.push({
        action: 'UPDATED',
        field: 'type',
        oldValue: existing.type,
        newValue: data.type,
        issueId,
        userId,
      });
    }

    if (data.priority !== undefined && data.priority !== existing.priority) {
      activities.push({
        action: 'UPDATED',
        field: 'priority',
        oldValue: existing.priority,
        newValue: data.priority,
        issueId,
        userId,
      });
    }

    if (data.statusId !== undefined && data.statusId !== existing.statusId) {
      const newStatus = await tx.status.findUnique({
        where: { id: data.statusId },
        select: { name: true },
      });
      activities.push({
        action: 'UPDATED',
        field: 'status',
        oldValue: existing.status.name,
        newValue: newStatus?.name ?? data.statusId,
        issueId,
        userId,
      });
    }

    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      activities.push({
        action: 'UPDATED',
        field: 'assignee',
        oldValue: existing.assigneeId,
        newValue: data.assigneeId ?? null,
        issueId,
        userId,
      });

      // Notify the new assignee
      if (data.assigneeId && data.assigneeId !== userId) {
        await tx.notification.create({
          data: {
            type: 'ASSIGNED',
            message: `You were assigned to ${existing.project.key}-${existing.number}: ${existing.title}`,
            userId: data.assigneeId,
            issueId,
          },
        });
      }
    }

    if (data.sprintId !== undefined && data.sprintId !== existing.sprintId) {
      activities.push({
        action: 'UPDATED',
        field: 'sprint',
        oldValue: existing.sprintId,
        newValue: data.sprintId ?? null,
        issueId,
        userId,
      });
    }

    // Create all activity logs
    if (activities.length > 0) {
      await tx.activityLog.createMany({ data: activities });
    }

    // Prepare update data
    const updateData: Prisma.IssueUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.statusId !== undefined) updateData.status = { connect: { id: data.statusId } };
    if (data.assigneeId !== undefined) {
      updateData.assignee = data.assigneeId
        ? { connect: { id: data.assigneeId } }
        : { disconnect: true };
    }
    if (data.sprintId !== undefined) {
      updateData.sprint = data.sprintId
        ? { connect: { id: data.sprintId } }
        : { disconnect: true };
    }
    if (data.epicId !== undefined) {
      updateData.epic = data.epicId
        ? { connect: { id: data.epicId } }
        : { disconnect: true };
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.storyPoints !== undefined) updateData.storyPoints = data.storyPoints;
    if (data.estimate !== undefined) updateData.estimate = data.estimate;

    // Handle label updates - replace all labels
    if (data.labelIds !== undefined) {
      await tx.issueLabel.deleteMany({ where: { issueId } });
      if (data.labelIds.length > 0) {
        await tx.issueLabel.createMany({
          data: data.labelIds.map((labelId) => ({ issueId, labelId })),
        });
      }
    }

    return tx.issue.update({
      where: { id: issueId },
      data: updateData,
      include: {
        status: true,
        assignee: { select: userSelect },
        reporter: { select: userSelect },
        project: { select: { id: true, name: true, key: true } },
      },
    });
  });
}

/**
 * Deletes an issue and all associated data.
 *
 * @param issueId - The issue ID to delete
 * @param userId - The requesting user's ID
 */
export async function deleteIssue(issueId: string, userId: string): Promise<void> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, userId);

  await prisma.issue.delete({
    where: { id: issueId },
  });
}

/**
 * Updates only the status of an issue (for drag-and-drop between columns).
 *
 * @param issueId - The issue ID
 * @param userId - The requesting user's ID
 * @param statusId - The new status ID
 * @returns The updated issue
 */
export async function updateIssueStatus(
  issueId: string,
  userId: string,
  statusId: string,
) {
  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      status: true,
      project: { select: { key: true } },
    },
  });

  if (!existing) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(existing.projectId, userId);

  // Validate workflow transition
  if (statusId !== existing.statusId) {
    const isAllowed = await validateTransition(existing.projectId, existing.statusId, statusId);
    if (!isAllowed) {
      throw new AppError(
        `Transition from "${existing.status.name}" to the requested status is not allowed by the workflow`,
        400,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const newStatus = await tx.status.findUnique({
      where: { id: statusId },
      select: { name: true },
    });

    // Log status change
    if (statusId !== existing.statusId) {
      await tx.activityLog.create({
        data: {
          action: 'UPDATED',
          field: 'status',
          oldValue: existing.status.name,
          newValue: newStatus?.name ?? statusId,
          issueId,
          userId,
        },
      });

      // Notify reporter and assignee about status change
      const notifyUserIds = new Set<string>();
      if (existing.reporterId !== userId) notifyUserIds.add(existing.reporterId);
      if (existing.assigneeId && existing.assigneeId !== userId) {
        notifyUserIds.add(existing.assigneeId);
      }

      if (notifyUserIds.size > 0) {
        await tx.notification.createMany({
          data: Array.from(notifyUserIds).map((notifyUserId) => ({
            type: 'STATUS_CHANGED' as const,
            message: `${existing.project.key}-${existing.number} status changed to ${newStatus?.name ?? 'Unknown'}`,
            userId: notifyUserId,
            issueId,
          })),
        });

        // Send email notifications for status change (fire-and-forget)
        for (const notifyUserId of notifyUserIds) {
          const recipientUser = await tx.user.findUnique({
            where: { id: notifyUserId },
            select: { email: true, name: true },
          });
          const changerUser = await tx.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          if (recipientUser) {
            emailService.sendStatusChangeEmail(
              recipientUser.email,
              recipientUser.name,
              `${existing.project.key}-${existing.number}`,
              existing.title,
              changerUser?.name ?? 'Someone',
              existing.status.name,
              newStatus?.name ?? 'Unknown',
              `${env.CLIENT_URL}/issues/${issueId}`,
            );
          }
        }
      }
    }

    return tx.issue.update({
      where: { id: issueId },
      data: { statusId },
      include: {
        status: true,
        assignee: { select: userSelect },
        reporter: { select: userSelect },
      },
    });
  });
}

/**
 * Adds a comment to an issue.
 *
 * @param issueId - The issue ID
 * @param authorId - The comment author's ID
 * @param content - The comment content
 * @returns The created comment with author info
 */
export async function addComment(issueId: string, authorId: string, content: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      projectId: true,
      title: true,
      number: true,
      reporterId: true,
      assigneeId: true,
      project: { select: { key: true } },
    },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, authorId);

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        content,
        issueId,
        authorId,
      },
      include: {
        author: { select: userSelect },
      },
    });

    // Create activity log
    await tx.activityLog.create({
      data: {
        action: 'COMMENTED',
        issueId,
        userId: authorId,
      },
    });

    // Parse @mentions from comment content
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    // Look up mentioned users
    const mentionedUserIds = new Set<string>();
    if (mentions.length > 0) {
      // Get workspace ID for this project
      const proj = await tx.project.findUnique({
        where: { id: issue.projectId },
        select: { workspaceId: true },
      });

      if (proj) {
        // Find users whose names match the mentions and are in the workspace
        const workspaceMembers = await tx.workspaceMember.findMany({
          where: { workspaceId: proj.workspaceId },
          include: { user: { select: { id: true, name: true } } },
        });

        for (const mention of mentions) {
          const mentionLower = mention.toLowerCase();
          for (const member of workspaceMembers) {
            const nameParts = member.user.name.toLowerCase().split(/\s+/);
            const fullNameNoSpaces = member.user.name.toLowerCase().replace(/\s+/g, '');
            if (
              nameParts.some(part => part === mentionLower) ||
              fullNameNoSpaces === mentionLower ||
              member.user.name.toLowerCase() === mentionLower
            ) {
              if (member.userId !== authorId) {
                mentionedUserIds.add(member.userId);
              }
            }
          }
        }

        // Create MENTIONED notifications
        if (mentionedUserIds.size > 0) {
          await tx.notification.createMany({
            data: Array.from(mentionedUserIds).map((mentionedUserId) => ({
              type: 'MENTIONED' as const,
              message: `You were mentioned in a comment on ${issue.project.key}-${issue.number}: ${issue.title}`,
              userId: mentionedUserId,
              issueId,
            })),
          });

          // Send email for mentions (fire-and-forget)
          for (const mentionedUserId of mentionedUserIds) {
            const mentionedUser = await tx.user.findUnique({
              where: { id: mentionedUserId },
              select: { email: true, name: true },
            });
            const authorUser = await tx.user.findUnique({
              where: { id: authorId },
              select: { name: true },
            });
            if (mentionedUser) {
              emailService.sendMentionEmail(
                mentionedUser.email,
                mentionedUser.name,
                `${issue.project.key}-${issue.number}`,
                issue.title,
                authorUser?.name ?? 'Someone',
                content.replace(/<[^>]*>/g, '').substring(0, 200),
                `${env.CLIENT_URL}/issues/${issueId}`,
              );
            }
          }
        }
      }
    }

    // Notify relevant users about the comment (exclude those already notified via mention)
    const notifyUserIds = new Set<string>();
    if (issue.reporterId !== authorId && !mentionedUserIds.has(issue.reporterId)) {
      notifyUserIds.add(issue.reporterId);
    }
    if (issue.assigneeId && issue.assigneeId !== authorId && !mentionedUserIds.has(issue.assigneeId)) {
      notifyUserIds.add(issue.assigneeId);
    }

    if (notifyUserIds.size > 0) {
      await tx.notification.createMany({
        data: Array.from(notifyUserIds).map((userId) => ({
          type: 'COMMENT' as const,
          message: `New comment on ${issue.project.key}-${issue.number}: ${issue.title}`,
          userId,
          issueId,
        })),
      });

      // Send email notifications for comment (fire-and-forget)
      for (const notifyUserId of notifyUserIds) {
        const recipientUser = await tx.user.findUnique({
          where: { id: notifyUserId },
          select: { email: true, name: true },
        });
        const authorUser = await tx.user.findUnique({
          where: { id: authorId },
          select: { name: true },
        });
        if (recipientUser) {
          emailService.sendCommentEmail(
            recipientUser.email,
            recipientUser.name,
            `${issue.project.key}-${issue.number}`,
            issue.title,
            authorUser?.name ?? 'Someone',
            content.replace(/<[^>]*>/g, '').substring(0, 200),
            `${env.CLIENT_URL}/issues/${issueId}`,
          );
        }
      }
    }

    return comment;
  });
}

/**
 * Lists all comments on an issue with cursor-based pagination.
 *
 * @param issueId - The issue ID
 * @param userId - The requesting user's ID
 * @param cursor - Pagination cursor (comment ID)
 * @param limit - Number of comments to return
 * @returns Paginated list of comments
 */
export async function listComments(
  issueId: string,
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, userId);

  const take = Math.min(limit, 100);

  const comments = await prisma.comment.findMany({
    where: { issueId },
    include: {
      author: { select: userSelect },
    },
    orderBy: { createdAt: 'asc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = comments.length > take;
  const data = hasMore ? comments.slice(0, take) : comments;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

/**
 * Retrieves the activity log for an issue with cursor-based pagination.
 *
 * @param issueId - The issue ID
 * @param userId - The requesting user's ID
 * @param cursor - Pagination cursor (activity log ID)
 * @param limit - Number of entries to return
 * @returns Paginated list of activity log entries
 */
export async function getActivityLog(
  issueId: string,
  userId: string,
  cursor?: string,
  limit = 50,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, userId);

  const take = Math.min(limit, 100);

  const activities = await prisma.activityLog.findMany({
    where: { issueId },
    include: {
      user: { select: userSelect },
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = activities.length > take;
  const data = hasMore ? activities.slice(0, take) : activities;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return { data, hasMore, nextCursor };
}

// ─── Issue Links ────────────────────────────────────────────────────────────

export async function addIssueLink(
  issueId: string,
  userId: string,
  type: IssueLinkType,
  targetIssueId: string,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) throw new NotFoundError('Issue');
  await verifyProjectAccess(issue.projectId, userId);

  const targetIssue = await prisma.issue.findUnique({
    where: { id: targetIssueId },
    select: { id: true },
  });

  if (!targetIssue) throw new NotFoundError('Target issue');

  const link = await prisma.issueLink.create({
    data: {
      type,
      sourceIssueId: issueId,
      targetIssueId,
    },
    include: {
      targetIssue: {
        include: {
          status: true,
          project: { select: { key: true } },
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'LINKED',
      field: 'link',
      newValue: `${type}: ${targetIssueId}`,
      issueId,
      userId,
    },
  });

  return {
    id: link.id,
    type: link.type,
    sourceIssueId: link.sourceIssueId,
    targetIssueId: link.targetIssueId,
    linkedIssue: {
      id: link.targetIssue.id,
      title: link.targetIssue.title,
      number: link.targetIssue.number,
      type: link.targetIssue.type,
      priority: link.targetIssue.priority,
      status: link.targetIssue.status,
      project: link.targetIssue.project,
    },
    createdAt: link.createdAt,
  };
}

export async function removeIssueLink(linkId: string, userId: string) {
  const link = await prisma.issueLink.findUnique({
    where: { id: linkId },
    include: { sourceIssue: { select: { projectId: true } } },
  });

  if (!link) throw new NotFoundError('Issue link');
  await verifyProjectAccess(link.sourceIssue.projectId, userId);

  await prisma.issueLink.delete({ where: { id: linkId } });
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export async function listLabels(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);
  return prisma.label.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  });
}

export async function createLabel(
  projectId: string,
  userId: string,
  name: string,
  color: string,
) {
  await verifyProjectAccess(projectId, userId);
  return prisma.label.create({
    data: { name, color, projectId },
  });
}

export async function deleteLabel(labelId: string, userId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { projectId: true },
  });

  if (!label) throw new NotFoundError('Label');
  await verifyProjectAccess(label.projectId, userId);

  await prisma.label.delete({ where: { id: labelId } });
}

// ─── Watchers ───────────────────────────────────────────────────────────────

export async function addWatcher(issueId: string, userId: string, watchUserId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) throw new NotFoundError('Issue');
  await verifyProjectAccess(issue.projectId, userId);

  return prisma.watcher.create({
    data: { issueId, userId: watchUserId },
    include: {
      user: { select: userSelect },
    },
  });
}

export async function removeWatcher(issueId: string, userId: string, watchUserId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) throw new NotFoundError('Issue');
  await verifyProjectAccess(issue.projectId, userId);

  await prisma.watcher.delete({
    where: { userId_issueId: { userId: watchUserId, issueId } },
  });
}

// ─── Time Logs ──────────────────────────────────────────────────────────────

export async function addTimeLog(
  issueId: string,
  userId: string,
  hours: number,
  description?: string,
  loggedAt?: string,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true, timeSpent: true },
  });

  if (!issue) throw new NotFoundError('Issue');
  await verifyProjectAccess(issue.projectId, userId);

  return prisma.$transaction(async (tx) => {
    const timeLog = await tx.timeLog.create({
      data: {
        hours,
        description,
        issueId,
        userId,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
      include: {
        user: { select: userSelect },
      },
    });

    await tx.issue.update({
      where: { id: issueId },
      data: { timeSpent: (issue.timeSpent ?? 0) + hours },
    });

    await tx.activityLog.create({
      data: {
        action: 'LOGGED_TIME',
        field: 'timeSpent',
        newValue: `${hours}h`,
        issueId,
        userId,
      },
    });

    return timeLog;
  });
}

export async function removeTimeLog(timeLogId: string, userId: string) {
  const timeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { issue: { select: { id: true, projectId: true, timeSpent: true } } },
  });

  if (!timeLog) throw new NotFoundError('Time log');
  await verifyProjectAccess(timeLog.issue.projectId, userId);

  await prisma.$transaction(async (tx) => {
    await tx.timeLog.delete({ where: { id: timeLogId } });
    await tx.issue.update({
      where: { id: timeLog.issue.id },
      data: { timeSpent: Math.max(0, (timeLog.issue.timeSpent ?? 0) - timeLog.hours) },
    });
  });
}

// ─── Reorder ─────────────────────────────────────────────────────────────

/**
 * Reorders an issue within a list (backlog or board column).
 *
 * Uses the midpoint strategy: calculates the new order value as the
 * midpoint between the previous and next items. If there is no previous
 * item, uses (next - 1). If there is no next item, uses (previous + 1).
 *
 * @param issueId - The issue to reorder
 * @param userId - The requesting user's ID
 * @param previousOrder - Order value of the item above (null if moving to top)
 * @param nextOrder - Order value of the item below (null if moving to bottom)
 * @returns The updated issue with the new order value
 */
export async function reorderIssue(
  issueId: string,
  userId: string,
  previousOrder: number | null,
  nextOrder: number | null,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) throw new NotFoundError('Issue');
  await verifyProjectAccess(issue.projectId, userId);

  let newOrder: number;

  if (previousOrder === null && nextOrder === null) {
    newOrder = 0;
  } else if (previousOrder === null) {
    newOrder = nextOrder! - 1;
  } else if (nextOrder === null) {
    newOrder = previousOrder + 1;
  } else {
    newOrder = (previousOrder + nextOrder) / 2;
  }

  return prisma.issue.update({
    where: { id: issueId },
    data: { order: newOrder },
    include: {
      status: true,
      assignee: { select: userSelect },
    },
  });
}
