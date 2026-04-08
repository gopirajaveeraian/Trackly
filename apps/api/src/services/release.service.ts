import { prisma } from '../config/db';
import { ReleaseStatus } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateReleaseInput {
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  projectId: string;
}

interface UpdateReleaseInput {
  name?: string;
  description?: string;
  status?: ReleaseStatus;
  startDate?: string;
  releaseDate?: string;
}

/** Status names considered as "done" (case-insensitive). */
const DONE_STATUS_NAMES = ['done', 'completed', 'closed'];

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
 * Lists all releases for a project with issue counts and progress (total vs done issues).
 *
 * @param projectId - The project to list releases from
 * @param userId - The requesting user's ID
 * @returns Array of releases with issue counts and progress
 */
export async function listReleases(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  const releases = await prisma.release.findMany({
    where: { projectId },
    include: {
      issues: {
        select: {
          id: true,
          status: { select: { name: true } },
        },
      },
      _count: { select: { issues: true } },
    },
    orderBy: { releaseDate: 'asc' },
  });

  return releases.map((release) => {
    const total = release.issues.length;
    const done = release.issues.filter((issue) =>
      DONE_STATUS_NAMES.includes(issue.status.name.toLowerCase()),
    ).length;

    const { issues: _issues, ...rest } = release;
    return {
      ...rest,
      progress: { total, done },
    };
  });
}

/**
 * Creates a new release for a project.
 *
 * @param input - Release creation data
 * @param userId - The requesting user's ID
 * @returns The created release
 */
export async function createRelease(input: CreateReleaseInput, userId: string) {
  const { name, description, startDate, releaseDate, projectId } = input;

  await verifyProjectAccess(projectId, userId);

  return prisma.release.create({
    data: {
      name,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      projectId,
    },
  });
}

/**
 * Retrieves a release with all its issues.
 *
 * @param releaseId - The release ID
 * @param userId - The requesting user's ID
 * @returns Release with populated issues
 * @throws NotFoundError if the release doesn't exist
 */
export async function getRelease(releaseId: string, userId: string) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
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

  if (!release) {
    throw new NotFoundError('Release');
  }

  await verifyProjectAccess(release.projectId, userId);

  return release;
}

/**
 * Updates release properties (name, description, status, dates).
 *
 * @param releaseId - The release ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns The updated release
 * @throws NotFoundError if the release doesn't exist
 */
export async function updateRelease(
  releaseId: string,
  userId: string,
  data: UpdateReleaseInput,
) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { projectId: true },
  });

  if (!release) {
    throw new NotFoundError('Release');
  }

  await verifyProjectAccess(release.projectId, userId);

  return prisma.release.update({
    where: { id: releaseId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.releaseDate !== undefined && { releaseDate: new Date(data.releaseDate) }),
    },
  });
}

/**
 * Deletes a release.
 *
 * @param releaseId - The release ID to delete
 * @param userId - The requesting user's ID
 * @throws NotFoundError if the release doesn't exist
 */
export async function deleteRelease(releaseId: string, userId: string) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { projectId: true },
  });

  if (!release) {
    throw new NotFoundError('Release');
  }

  await verifyProjectAccess(release.projectId, userId);

  return prisma.release.delete({
    where: { id: releaseId },
  });
}

/**
 * Adds an issue to a release by setting its releaseId.
 *
 * @param releaseId - The release ID
 * @param issueId - The issue ID to add
 * @param userId - The requesting user's ID
 * @returns The updated issue
 */
export async function addIssueToRelease(releaseId: string, issueId: string, userId: string) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { projectId: true },
  });

  if (!release) {
    throw new NotFoundError('Release');
  }

  await verifyProjectAccess(release.projectId, userId);

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  if (issue.projectId !== release.projectId) {
    throw new AppError('Issue and release must belong to the same project', 400);
  }

  return prisma.issue.update({
    where: { id: issueId },
    data: { releaseId },
  });
}

/**
 * Removes an issue from its release by setting releaseId to null.
 *
 * @param issueId - The issue ID to remove from release
 * @param userId - The requesting user's ID
 * @returns The updated issue
 */
export async function removeIssueFromRelease(issueId: string, userId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { projectId: true },
  });

  if (!issue) {
    throw new NotFoundError('Issue');
  }

  await verifyProjectAccess(issue.projectId, userId);

  return prisma.issue.update({
    where: { id: issueId },
    data: { releaseId: null },
  });
}
