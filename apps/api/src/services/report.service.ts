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
 * Generates a burndown chart dataset for the given sprint.
 *
 * Builds day-by-day data from the sprint start date to end date (or today
 * if the sprint is still active). For each day, computes the remaining
 * story points by subtracting points of issues moved to a "done" status
 * (determined via ActivityLog entries) by that day.
 *
 * @param sprintId - The sprint to generate the burndown for
 * @param userId - The requesting user's ID
 * @returns Sprint metadata, daily burndown data, and total story points
 * @throws NotFoundError if the sprint does not exist
 * @throws ForbiddenError if the user does not have access to the project
 */
export async function getBurndown(sprintId: string, userId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
  });

  if (!sprint) {
    throw new NotFoundError('Sprint');
  }

  await verifyProjectAccess(sprint.projectId, userId);

  if (!sprint.startDate) {
    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
      },
      data: [],
      totalPoints: 0,
    };
  }

  // Fetch all issues in the sprint with their statuses and story points
  const issues = await prisma.issue.findMany({
    where: { sprintId },
    select: {
      id: true,
      storyPoints: true,
      status: { select: { id: true, name: true } },
    },
  });

  const totalPoints = issues.reduce(
    (sum, issue) => sum + (issue.storyPoints ?? 0),
    0,
  );

  // Fetch all activity logs where field='status' for issues in this sprint
  const issueIds = issues.map((i) => i.id);

  const statusActivities = await prisma.activityLog.findMany({
    where: {
      issueId: { in: issueIds },
      field: 'status',
    },
    orderBy: { createdAt: 'asc' },
  });

  // Build a map of storyPoints per issue ID for quick lookup
  const issuePointsMap = new Map<string, number>();
  for (const issue of issues) {
    issuePointsMap.set(issue.id, issue.storyPoints ?? 0);
  }

  // Determine the end boundary for the chart
  const endBoundary = sprint.status === 'ACTIVE'
    ? new Date()
    : sprint.endDate ?? new Date();

  const startDate = new Date(sprint.startDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endBoundary);
  endDate.setHours(23, 59, 59, 999);

  // For each day, determine which issues had been moved to "done" by end of that day
  const data: Array<{ date: string; ideal: number; remaining: number }> = [];

  // Calculate total days for the ideal line
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  for (
    let current = new Date(startDate);
    current <= endDate;
    current.setDate(current.getDate() + 1)
  ) {
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    // Track the latest status per issue up to this day
    const latestStatusByIssue = new Map<string, string>();

    for (const activity of statusActivities) {
      if (activity.createdAt <= dayEnd && activity.newValue) {
        latestStatusByIssue.set(activity.issueId, activity.newValue);
      }
    }

    // Calculate completed points: issues whose latest status is a "done" status
    let completedPoints = 0;
    for (const [issueId, statusName] of latestStatusByIssue) {
      if (DONE_STATUS_NAMES.includes(statusName.toLowerCase())) {
        completedPoints += issuePointsMap.get(issueId) ?? 0;
      }
    }

    const dayIndex = Math.ceil(
      (current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const ideal = totalDays > 0
      ? Math.max(0, totalPoints - (totalPoints / totalDays) * dayIndex)
      : 0;

    data.push({
      date: current.toISOString().split('T')[0],
      ideal: Math.round(ideal * 100) / 100,
      remaining: totalPoints - completedPoints,
    });
  }

  return {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      status: sprint.status,
    },
    data,
    totalPoints,
  };
}

/**
 * Computes sprint velocity data for a project.
 *
 * For each completed or active sprint, calculates committed points (total
 * story points of all issues assigned to the sprint) and completed points
 * (story points of issues in a "done" status).
 *
 * @param projectId - The project to compute velocity for
 * @param userId - The requesting user's ID
 * @returns Array of sprint velocity entries
 * @throws NotFoundError if the project does not exist
 * @throws ForbiddenError if the user does not have access to the project
 */
export async function getVelocity(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  const sprints = await prisma.sprint.findMany({
    where: {
      projectId,
      status: { in: ['COMPLETED', 'ACTIVE'] },
    },
    include: {
      issues: {
        select: {
          storyPoints: true,
          status: { select: { name: true } },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });

  return sprints.map((sprint) => {
    const committed = sprint.issues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    );

    const completed = sprint.issues
      .filter((issue) =>
        DONE_STATUS_NAMES.includes(issue.status.name.toLowerCase()),
      )
      .reduce((sum, issue) => sum + (issue.storyPoints ?? 0), 0);

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      committed,
      completed,
    };
  });
}

/**
 * Computes workload distribution across team members for a project.
 *
 * Groups all non-done issues by assignee and returns the issue count
 * and total story points per person. Unassigned issues are grouped
 * under a null userId with the name "Unassigned".
 *
 * @param projectId - The project to compute workload for
 * @param userId - The requesting user's ID
 * @returns Array of workload entries per assignee
 * @throws NotFoundError if the project does not exist
 * @throws ForbiddenError if the user does not have access to the project
 */
export async function getWorkload(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  // Get all issues for the project with status info, then filter in memory
  const allIssues = await prisma.issue.findMany({
    where: { projectId },
    select: {
      storyPoints: true,
      assigneeId: true,
      assignee: {
        select: { id: true, name: true, avatar: true },
      },
      status: { select: { name: true } },
    },
  });

  // Filter out done issues (case-insensitive)
  const issues = allIssues.filter(
    (issue) => !DONE_STATUS_NAMES.includes(issue.status.name.toLowerCase()),
  );

  // Group by assignee
  const workloadMap = new Map<
    string | null,
    { name: string; avatar: string | null; issueCount: number; storyPoints: number }
  >();

  for (const issue of issues) {
    const key = issue.assigneeId;
    const existing = workloadMap.get(key);

    if (existing) {
      existing.issueCount += 1;
      existing.storyPoints += issue.storyPoints ?? 0;
    } else {
      workloadMap.set(key, {
        name: issue.assignee?.name ?? 'Unassigned',
        avatar: issue.assignee?.avatar ?? null,
        issueCount: 1,
        storyPoints: issue.storyPoints ?? 0,
      });
    }
  }

  return Array.from(workloadMap.entries()).map(([assigneeId, data]) => ({
    userId: assigneeId,
    name: data.name,
    avatar: data.avatar,
    issueCount: data.issueCount,
    storyPoints: data.storyPoints,
  }));
}

/**
 * Computes a summary of issues grouped by status for a project.
 *
 * Returns the count of issues and total story points per status,
 * ordered by the status display order.
 *
 * @param projectId - The project to summarize
 * @param userId - The requesting user's ID
 * @returns Array of status summary entries
 * @throws NotFoundError if the project does not exist
 * @throws ForbiddenError if the user does not have access to the project
 */
export async function getStatusSummary(projectId: string, userId: string) {
  await verifyProjectAccess(projectId, userId);

  const statuses = await prisma.status.findMany({
    where: { projectId },
    include: {
      issues: {
        where: { projectId },
        select: { storyPoints: true },
      },
    },
    orderBy: { order: 'asc' },
  });

  return statuses.map((status) => ({
    statusId: status.id,
    statusName: status.name,
    color: status.color,
    issueCount: status.issues.length,
    storyPoints: status.issues.reduce(
      (sum, issue) => sum + (issue.storyPoints ?? 0),
      0,
    ),
  }));
}
