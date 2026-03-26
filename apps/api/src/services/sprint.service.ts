import { prisma } from '../config/db';
import { SprintStatus } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId: string;
}

interface UpdateSprintInput {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Verifies workspace membership via a project ID.
 */
async function verifyProjectAccess(projectId: string, userId: string): Promise<void> {
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
}

/**
 * Lists all sprints for a project, ordered by creation date.
 *
 * @param projectId - The project to list sprints from
 * @param userId - The requesting user's ID
 * @returns Array of sprints with issue counts
 */
export async function listSprints(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  return prisma.sprint.findMany({
    where: { projectId },
    include: {
      _count: { select: { issues: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

/**
 * Creates a new sprint for a project.
 *
 * @param input - Sprint creation data
 * @param userId - The requesting user's ID
 * @returns The created sprint
 */
export async function createSprint(input: CreateSprintInput, userId: string) {
  const { name, goal, startDate, endDate, projectId } = input;

  await verifyProjectAccess(projectId, userId);

  return prisma.sprint.create({
    data: {
      name,
      goal,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      projectId,
    },
  });
}

/**
 * Retrieves a sprint with all its issues.
 *
 * @param sprintId - The sprint ID
 * @param userId - The requesting user's ID
 * @returns Sprint with populated issues
 * @throws NotFoundError if the sprint doesn't exist
 */
export async function getSprint(sprintId: string, userId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      issues: {
        include: {
          status: true,
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          _count: { select: { comments: true, subTasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { issues: true } },
    },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  await verifyProjectAccess(sprint.projectId, userId);

  return sprint;
}

/**
 * Updates sprint properties (name, goal, dates).
 *
 * @param sprintId - The sprint ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns The updated sprint
 * @throws NotFoundError if the sprint doesn't exist
 */
export async function updateSprint(
  sprintId: string,
  userId: string,
  data: UpdateSprintInput,
) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { projectId: true },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  await verifyProjectAccess(sprint.projectId, userId);

  return prisma.sprint.update({
    where: { id: sprintId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.goal !== undefined && { goal: data.goal }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
    },
  });
}

/**
 * Starts a sprint by setting its status to ACTIVE.
 * Only one sprint can be active at a time per project.
 * If no dates are set, defaults to a 2-week sprint starting now.
 *
 * @param sprintId - The sprint ID to start
 * @param userId - The requesting user's ID
 * @returns The started sprint
 * @throws AppError if the sprint is not in PLANNED status
 * @throws AppError if another sprint is already active in the project
 */
export async function startSprint(sprintId: string, userId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  await verifyProjectAccess(sprint.projectId, userId);

  if (sprint.status !== SprintStatus.PLANNED) {
    throw new AppError('Only planned sprints can be started', 400);
  }

  // Check for existing active sprint in the same project
  const activeSprint = await prisma.sprint.findFirst({
    where: {
      projectId: sprint.projectId,
      status: SprintStatus.ACTIVE,
    },
  });

  if (activeSprint) {
    throw new AppError(
      `Sprint "${activeSprint.name}" is already active. Complete it before starting a new one.`,
      400,
    );
  }

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: SprintStatus.ACTIVE,
      startDate: sprint.startDate ?? now,
      endDate: sprint.endDate ?? twoWeeksLater,
    },
  });
}

/**
 * Completes a sprint, moving all incomplete issues back to the backlog
 * (i.e., removing their sprint assignment).
 *
 * @param sprintId - The sprint ID to complete
 * @param userId - The requesting user's ID
 * @returns Object with the completed sprint and count of moved issues
 * @throws AppError if the sprint is not in ACTIVE status
 */
export async function completeSprint(sprintId: string, userId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: {
        include: {
          statuses: { orderBy: { order: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  await verifyProjectAccess(sprint.projectId, userId);

  if (sprint.status !== SprintStatus.ACTIVE) {
    throw new AppError('Only active sprints can be completed', 400);
  }

  // The "Done" status is the last one by order
  const doneStatus = sprint.project.statuses[0];

  return prisma.$transaction(async (tx) => {
    // Find incomplete issues (not in Done status)
    const incompleteIssues = doneStatus
      ? await tx.issue.findMany({
          where: {
            sprintId,
            statusId: { not: doneStatus.id },
          },
          select: { id: true },
        })
      : await tx.issue.findMany({
          where: { sprintId },
          select: { id: true },
        });

    // Move incomplete issues to backlog (remove sprint association)
    if (incompleteIssues.length > 0) {
      await tx.issue.updateMany({
        where: {
          id: { in: incompleteIssues.map((i) => i.id) },
        },
        data: { sprintId: null },
      });
    }

    // Mark sprint as completed
    const completedSprint = await tx.sprint.update({
      where: { id: sprintId },
      data: { status: SprintStatus.COMPLETED },
    });

    return {
      sprint: completedSprint,
      movedToBacklog: incompleteIssues.length,
    };
  });
}
