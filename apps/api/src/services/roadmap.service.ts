import { prisma } from '../config/db';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

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
 * Returns roadmap data for a project, including epics and releases
 * with their date ranges, progress, and issue counts.
 *
 * Epics derive their date range from the earliest and latest issue due dates within them.
 *
 * @param projectId - The project to get the roadmap for
 * @param userId - The requesting user's ID
 * @returns Object with epics and releases arrays
 */
export async function getRoadmap(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  // Fetch epics with their issues
  const epics = await prisma.issue.findMany({
    where: {
      projectId,
      type: 'EPIC',
    },
    include: {
      subTasks: {
        select: {
          id: true,
          dueDate: true,
          status: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch releases with their issues
  const releases = await prisma.release.findMany({
    where: { projectId },
    include: {
      issues: {
        select: {
          id: true,
          status: { select: { name: true } },
        },
      },
    },
    orderBy: { releaseDate: 'asc' },
  });

  // Epic color palette for visual differentiation
  const epicColors = [
    '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
    '#7C3AED', '#EC4899', '#0891B2', '#65A30D', '#EA580C',
  ];

  const epicData = epics.map((epic, index) => {
    const issueDates = epic.subTasks
      .filter((issue) => issue.dueDate !== null)
      .map((issue) => issue.dueDate!.getTime());

    const startDate = issueDates.length > 0 ? new Date(Math.min(...issueDates)) : null;
    const endDate = issueDates.length > 0 ? new Date(Math.max(...issueDates)) : null;

    const total = epic.subTasks.length;
    const done = epic.subTasks.filter((issue) =>
      DONE_STATUS_NAMES.includes(issue.status.name.toLowerCase()),
    ).length;

    return {
      id: epic.id,
      name: epic.title,
      startDate: startDate?.toISOString() ?? null,
      endDate: endDate?.toISOString() ?? null,
      progress: { total, done },
      issueCount: total,
      color: epicColors[index % epicColors.length],
    };
  });

  const releaseData = releases.map((release) => {
    const total = release.issues.length;
    const done = release.issues.filter((issue) =>
      DONE_STATUS_NAMES.includes(issue.status.name.toLowerCase()),
    ).length;

    return {
      id: release.id,
      name: release.name,
      startDate: release.startDate?.toISOString() ?? null,
      releaseDate: release.releaseDate?.toISOString() ?? null,
      progress: { total, done },
      issueCount: total,
      color: '#6366F1',
    };
  });

  return {
    epics: epicData,
    releases: releaseData,
  };
}
