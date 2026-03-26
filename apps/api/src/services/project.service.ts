import { prisma } from '../config/db';
import { ProjectType } from '@prisma/client';
import { ForbiddenError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { createDefaultTransitions } from './workflow.service';

interface CreateProjectInput {
  name: string;
  key: string;
  type: ProjectType;
  description?: string;
  workspaceId: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
  type?: ProjectType;
}

interface CreateStatusInput {
  name: string;
  color: string;
  order: number;
}

/** Default statuses created for every new project. */
const DEFAULT_STATUSES = [
  { name: 'To Do', color: '#6B7280', order: 0 },
  { name: 'In Progress', color: '#3B82F6', order: 1 },
  { name: 'In Review', color: '#F59E0B', order: 2 },
  { name: 'Done', color: '#10B981', order: 3 },
];

/**
 * Verifies that a user is a member of the workspace that contains the project.
 *
 * @param userId - The user's ID
 * @param workspaceId - The workspace ID
 * @throws ForbiddenError if the user is not a member
 */
async function verifyWorkspaceMembership(userId: string, workspaceId: string): Promise<void> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }
}

/**
 * Lists all projects in a workspace.
 *
 * @param workspaceId - The workspace to list projects from
 * @param userId - The requesting user's ID
 * @returns Array of projects with issue and sprint counts
 */
export async function listProjects(workspaceId: string, userId: string) {
  await verifyWorkspaceMembership(userId, workspaceId);

  return prisma.project.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { issues: true, sprints: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new project with default statuses.
 * The project key must be unique within the workspace.
 *
 * @param input - Project creation data
 * @param userId - The requesting user's ID
 * @returns The created project with its default statuses
 * @throws ConflictError if a project with the same key exists in the workspace
 */
export async function createProject(input: CreateProjectInput, userId: string) {
  const { name, key, type, description, workspaceId } = input;

  await verifyWorkspaceMembership(userId, workspaceId);

  // Check for duplicate key in workspace
  const existing = await prisma.project.findFirst({
    where: { key: key.toUpperCase(), workspaceId },
  });

  if (existing) {
    throw new ConflictError('A project with this key already exists in the workspace');
  }

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        key: key.toUpperCase(),
        type,
        description,
        workspaceId,
      },
    });

    // Create default statuses
    await tx.status.createMany({
      data: DEFAULT_STATUSES.map((s) => ({
        ...s,
        projectId: project.id,
      })),
    });

    // Create default workflow transitions (all statuses can transition to all others)
    await createDefaultTransitions(project.id);

    // Return project with statuses
    return tx.project.findUnique({
      where: { id: project.id },
      include: {
        statuses: { orderBy: { order: 'asc' } },
      },
    });
  });
}

/**
 * Retrieves a single project with its statuses and counts.
 *
 * @param projectId - The project ID
 * @param userId - The requesting user's ID
 * @returns Project with statuses, issue count, and sprint count
 * @throws NotFoundError if the project doesn't exist
 */
export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      statuses: { orderBy: { order: 'asc' } },
      _count: {
        select: { issues: true, sprints: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await verifyWorkspaceMembership(userId, project.workspaceId);

  return project;
}

/**
 * Updates project properties (name, description, type).
 *
 * @param projectId - The project ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns The updated project
 * @throws NotFoundError if the project doesn't exist
 */
export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectInput,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await verifyWorkspaceMembership(userId, project.workspaceId);

  return prisma.project.update({
    where: { id: projectId },
    data,
    include: {
      statuses: { orderBy: { order: 'asc' } },
    },
  });
}

/**
 * Deletes a project and all associated data (issues, sprints, statuses).
 * Cascading deletes are handled by the Prisma schema.
 *
 * @param projectId - The project ID to delete
 * @param userId - The requesting user's ID
 * @throws NotFoundError if the project doesn't exist
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await verifyWorkspaceMembership(userId, project.workspaceId);

  await prisma.project.delete({
    where: { id: projectId },
  });
}

/**
 * Gets all statuses for a project, ordered by their position.
 *
 * @param projectId - The project ID
 * @param userId - The requesting user's ID
 * @returns Ordered array of statuses
 */
export async function getStatuses(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await verifyWorkspaceMembership(userId, project.workspaceId);

  return prisma.status.findMany({
    where: { projectId },
    orderBy: { order: 'asc' },
  });
}

/**
 * Creates a custom status for a project.
 *
 * @param projectId - The project ID
 * @param userId - The requesting user's ID
 * @param data - Status data (name, color, order)
 * @returns The created status
 */
export async function createStatus(
  projectId: string,
  userId: string,
  data: CreateStatusInput,
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  await verifyWorkspaceMembership(userId, project.workspaceId);

  return prisma.status.create({
    data: {
      ...data,
      projectId,
    },
  });
}
