import { prisma } from '../config/db';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

async function verifyProjectAccess(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw new NotFoundError('Project');
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
  });
  if (!membership) throw new ForbiddenError('You do not have access to this project');
}

/**
 * Creates default workflow transitions for a project (all statuses can transition to all others).
 */
export async function createDefaultTransitions(projectId: string): Promise<void> {
  const statuses = await prisma.status.findMany({
    where: { projectId },
    select: { id: true },
  });

  const transitions: Array<{ fromStatusId: string; toStatusId: string; projectId: string }> = [];
  for (const from of statuses) {
    for (const to of statuses) {
      if (from.id !== to.id) {
        transitions.push({ fromStatusId: from.id, toStatusId: to.id, projectId });
      }
    }
  }

  if (transitions.length > 0) {
    await prisma.workflowTransition.createMany({
      data: transitions,
      skipDuplicates: true,
    });
  }
}

/**
 * Lists all workflow transitions for a project.
 */
export async function listTransitions(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  return prisma.workflowTransition.findMany({
    where: { projectId },
    include: {
      fromStatus: { select: { id: true, name: true, color: true, order: true } },
      toStatus: { select: { id: true, name: true, color: true, order: true } },
    },
    orderBy: [{ fromStatus: { order: 'asc' } }, { toStatus: { order: 'asc' } }],
  });
}

/**
 * Gets allowed transitions from a specific status.
 */
export async function getAllowedTransitions(projectId: string, fromStatusId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  const transitions = await prisma.workflowTransition.findMany({
    where: { projectId, fromStatusId },
    include: {
      toStatus: { select: { id: true, name: true, color: true, order: true } },
    },
    orderBy: { toStatus: { order: 'asc' } },
  });

  return transitions.map((t) => t.toStatus);
}

/**
 * Adds a workflow transition.
 */
export async function addTransition(
  projectId: string,
  userId: string,
  fromStatusId: string,
  toStatusId: string,
) {
  await verifyProjectAccess(projectId, userId);

  // Verify both statuses belong to this project
  const [fromStatus, toStatus] = await Promise.all([
    prisma.status.findFirst({ where: { id: fromStatusId, projectId } }),
    prisma.status.findFirst({ where: { id: toStatusId, projectId } }),
  ]);

  if (!fromStatus) throw new NotFoundError('From status');
  if (!toStatus) throw new NotFoundError('To status');
  if (fromStatusId === toStatusId) throw new AppError('Cannot create transition to the same status', 400);

  return prisma.workflowTransition.create({
    data: { fromStatusId, toStatusId, projectId },
    include: {
      fromStatus: { select: { id: true, name: true, color: true, order: true } },
      toStatus: { select: { id: true, name: true, color: true, order: true } },
    },
  });
}

/**
 * Removes a workflow transition.
 */
export async function removeTransition(transitionId: string, userId: string) {
  const transition = await prisma.workflowTransition.findUnique({
    where: { id: transitionId },
    select: { projectId: true },
  });

  if (!transition) throw new NotFoundError('Workflow transition');
  await verifyProjectAccess(transition.projectId, userId);

  await prisma.workflowTransition.delete({ where: { id: transitionId } });
}

/**
 * Validates that a status transition is allowed.
 * Returns true if the transition exists or if no transitions are configured (permissive mode).
 */
export async function validateTransition(
  projectId: string,
  fromStatusId: string,
  toStatusId: string,
): Promise<boolean> {
  // Check if project has ANY transitions configured
  const transitionCount = await prisma.workflowTransition.count({
    where: { projectId },
  });

  // If no transitions configured, allow all (permissive mode)
  if (transitionCount === 0) return true;

  // Check if this specific transition exists
  const transition = await prisma.workflowTransition.findUnique({
    where: {
      fromStatusId_toStatusId_projectId: {
        fromStatusId,
        toStatusId,
        projectId,
      },
    },
  });

  return !!transition;
}
