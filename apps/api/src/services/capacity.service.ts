import { prisma } from '../config/db';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

/**
 * Verifies workspace membership via a sprint's project ID.
 */
async function verifySprintAccess(sprintId: string, userId: string): Promise<string> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { projectId: true, project: { select: { workspaceId: true } } },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: sprint.project.workspaceId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You do not have access to this sprint');
  }

  return sprint.projectId;
}

/**
 * Lists all capacities for a sprint with user info.
 * Also computes allocatedHours from issue estimates assigned to the user in that sprint.
 *
 * @param sprintId - The sprint to list capacities from
 * @param userId - The requesting user's ID
 * @returns Array of capacities with user info and computed allocated hours
 */
export async function listCapacities(sprintId: string, userId: string) {
  await verifySprintAccess(sprintId, userId);

  const capacities = await prisma.capacity.findMany({
    where: { sprintId },
    include: {
      user: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Compute allocated hours from issue estimates assigned to each user in this sprint
  const issues = await prisma.issue.findMany({
    where: { sprintId, assigneeId: { not: null } },
    select: { assigneeId: true, estimate: true },
  });

  const allocatedByUser = new Map<string, number>();
  for (const issue of issues) {
    if (issue.assigneeId) {
      const current = allocatedByUser.get(issue.assigneeId) ?? 0;
      allocatedByUser.set(issue.assigneeId, current + (issue.estimate ?? 0));
    }
  }

  return capacities.map((capacity) => ({
    ...capacity,
    allocatedHours: allocatedByUser.get(capacity.userId) ?? 0,
  }));
}

/**
 * Creates or updates a capacity entry for a user in a sprint.
 *
 * @param sprintId - The sprint ID
 * @param userId - The requesting user's ID
 * @param targetUserId - The user whose capacity is being set
 * @param availableHours - The available hours to set
 * @returns The upserted capacity
 */
export async function upsertCapacity(
  sprintId: string,
  userId: string,
  targetUserId: string,
  availableHours: number,
) {
  await verifySprintAccess(sprintId, userId);

  return prisma.capacity.upsert({
    where: {
      userId_sprintId: { userId: targetUserId, sprintId },
    },
    create: {
      userId: targetUserId,
      sprintId,
      availableHours,
    },
    update: {
      availableHours,
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });
}
