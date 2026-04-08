import { prisma } from '../config/db';
import {
  JiraClient,
  JiraIssue,
  JiraSprint,
  JiraStatus,
  JiraIssueTypeWithStatuses,
  adfToPlainText,
} from '../utils/jira-client';
import { IssueType, Priority, ProjectType, SprintStatus, IssueLinkType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ImportInput {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
  workspaceId: string;
  userId: string;
}

interface ImportStats {
  statuses: number;
  sprints: number;
  epics: number;
  issues: number;
  comments: number;
  labels: number;
  links: number;
  usersMatched: number;
  usersMissed: number;
}

export interface ImportResult {
  projectId: string;
  projectName: string;
  projectKey: string;
  stats: ImportStats;
  warnings: string[];
}

// ─── Status Mapping ────────────────────────────────────────────────────────────

const STATUS_CATEGORY_MAP: Record<string, { name: string; order: number; color: string }> = {
  'to do':          { name: 'To Do',       order: 0, color: '#6B7280' },
  'open':           { name: 'To Do',       order: 0, color: '#6B7280' },
  'backlog':        { name: 'To Do',       order: 0, color: '#6B7280' },
  'new':            { name: 'To Do',       order: 0, color: '#6B7280' },
  'reopened':       { name: 'To Do',       order: 0, color: '#6B7280' },
  'in progress':    { name: 'In Progress', order: 1, color: '#3B82F6' },
  'in development': { name: 'In Progress', order: 1, color: '#3B82F6' },
  'in review':      { name: 'In Review',   order: 2, color: '#8B5CF6' },
  'code review':    { name: 'In Review',   order: 2, color: '#8B5CF6' },
  'in qa':          { name: 'In Review',   order: 2, color: '#8B5CF6' },
  'review':         { name: 'In Review',   order: 2, color: '#8B5CF6' },
  'done':           { name: 'Done',        order: 3, color: '#10B981' },
  'closed':         { name: 'Done',        order: 3, color: '#10B981' },
  'resolved':       { name: 'Done',        order: 3, color: '#10B981' },
};

// ─── Issue Type Mapping ────────────────────────────────────────────────────────

function mapIssueType(jiraTypeName: string): IssueType {
  const normalized = jiraTypeName.toLowerCase().trim();
  if (normalized === 'bug') return IssueType.BUG;
  if (normalized === 'story' || normalized === 'user story') return IssueType.STORY;
  if (normalized === 'epic') return IssueType.EPIC;
  if (normalized === 'sub-task' || normalized === 'subtask' || normalized === 'sub task')
    return IssueType.SUBTASK;
  return IssueType.TASK;
}

// ─── Priority Mapping ──────────────────────────────────────────────────────────

function mapPriority(jiraPriorityName: string): Priority {
  const normalized = jiraPriorityName.toLowerCase().trim();
  if (normalized === 'highest' || normalized === 'critical' || normalized === 'blocker')
    return Priority.CRITICAL;
  if (normalized === 'high') return Priority.HIGH;
  if (normalized === 'medium' || normalized === 'normal') return Priority.MEDIUM;
  if (normalized === 'low' || normalized === 'lowest' || normalized === 'trivial')
    return Priority.LOW;
  return Priority.MEDIUM;
}

// ─── Sprint State Mapping ──────────────────────────────────────────────────────

function mapSprintState(jiraState: string): SprintStatus {
  switch (jiraState) {
    case 'active':
      return SprintStatus.ACTIVE;
    case 'closed':
      return SprintStatus.COMPLETED;
    case 'future':
    default:
      return SprintStatus.PLANNED;
  }
}

// ─── Issue Link Type Mapping ───────────────────────────────────────────────────

function mapIssueLinkType(
  jiraLinkTypeName: string,
  direction: 'inward' | 'outward',
): IssueLinkType {
  const normalized = jiraLinkTypeName.toLowerCase().trim();

  if (normalized === 'blocks') {
    return direction === 'outward' ? IssueLinkType.BLOCKS : IssueLinkType.IS_BLOCKED_BY;
  }
  if (normalized === 'duplicate' || normalized === 'duplicates' || normalized === 'is duplicated by') {
    return IssueLinkType.DUPLICATES;
  }
  // Default to RELATES_TO for "Relates", "Cloners", etc.
  return IssueLinkType.RELATES_TO;
}

// ─── Label Color Generator ────────────────────────────────────────────────────

const LABEL_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#F43F5E', '#14B8A6', '#0EA5E9', '#A855F7', '#D946EF',
];

function getLabelColor(index: number): string {
  return LABEL_COLORS[index % LABEL_COLORS.length];
}

// ─── Main Import Function ──────────────────────────────────────────────────────

/**
 * Imports a full Jira project into Trackly.
 *
 * Connects to Jira Cloud REST API, fetches all project data (issues, sprints,
 * statuses, comments, links, labels), and creates corresponding Trackly records.
 *
 * @param input - Import configuration including Jira credentials and target workspace
 * @returns Import results with statistics and warnings
 */
export async function importJiraProject(input: ImportInput): Promise<ImportResult> {
  const { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, workspaceId, userId } = input;
  const warnings: string[] = [];
  const stats: ImportStats = {
    statuses: 0,
    sprints: 0,
    epics: 0,
    issues: 0,
    comments: 0,
    labels: 0,
    links: 0,
    usersMatched: 0,
    usersMissed: 0,
  };

  // ─── Step 1: Connect & Validate ────────────────────────────────────────────

  console.log('[JiraImport] Step 1: Connecting to Jira and validating credentials...');

  const client = new JiraClient(jiraBaseUrl, jiraEmail, jiraApiToken);

  let jiraProject;
  try {
    jiraProject = await client.getProject(jiraProjectKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(
      `Failed to connect to Jira or project not found: ${message}`,
      400,
    );
  }

  console.log(`[JiraImport] Connected. Project: ${jiraProject.name} (${jiraProject.key})`);

  // Verify the workspace exists and user has access
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new AppError('Workspace not found', 404);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw new AppError('You are not a member of this workspace', 403);
  }

  // ─── Step 2: Fetch all Jira data ──────────────────────────────────────────

  console.log('[JiraImport] Step 2: Fetching all Jira data...');

  const jiraStatuses = await client.getStatuses(jiraProjectKey);
  console.log(`[JiraImport]   Fetched statuses for ${jiraStatuses.length} issue types`);

  const allIssues = await client.getAllProjectIssues(jiraProjectKey);
  console.log(`[JiraImport]   Fetched ${allIssues.length} issues`);

  // Fetch sprints via board (may not exist for all projects)
  let jiraSprints: JiraSprint[] = [];
  const board = await client.getBoard(jiraProjectKey);

  if (board) {
    try {
      jiraSprints = await client.getSprints(board.id);
      console.log(`[JiraImport]   Fetched ${jiraSprints.length} sprints`);
    } catch {
      warnings.push('Could not fetch sprints from board. Sprint data from issues will be used instead.');
      console.log('[JiraImport]   Warning: Could not fetch sprints from board');
    }
  } else {
    warnings.push('No board found for this project. Sprint data will be extracted from issues.');
    console.log('[JiraImport]   No board found, sprints will be extracted from issue data');
  }

  // ─── Step 3: Create Trackly Project ────────────────────────────────────────

  console.log('[JiraImport] Step 3: Creating Trackly project...');

  const projectType: ProjectType =
    board?.type === 'kanban' ? ProjectType.KANBAN : ProjectType.SCRUM;

  // Determine a unique project key
  let projectKey = jiraProject.key;
  let keySuffix = 0;
  while (true) {
    const candidateKey = keySuffix === 0 ? projectKey : `${projectKey}${keySuffix}`;
    const existing = await prisma.project.findFirst({
      where: { key: candidateKey, workspaceId },
    });
    if (!existing) {
      projectKey = candidateKey;
      break;
    }
    keySuffix++;
  }

  const tracklyProject = await prisma.project.create({
    data: {
      name: jiraProject.name,
      key: projectKey,
      type: projectType,
      description: jiraProject.description ?? `Imported from Jira project ${jiraProject.key}`,
      workspaceId,
    },
  });

  console.log(`[JiraImport]   Created project: ${tracklyProject.name} (${tracklyProject.key})`);

  // ─── Step 4: Map & Create Statuses ─────────────────────────────────────────

  console.log('[JiraImport] Step 4: Mapping and creating statuses...');

  // Collect unique statuses from all issue types
  const uniqueJiraStatuses = collectUniqueStatuses(jiraStatuses);

  // Deduplicate into Trackly statuses
  const statusMapping = new Map<string, string>(); // jiraStatusName → tracklyStatusId
  const createdStatusNames = new Map<string, string>(); // tracklyStatusName → tracklyStatusId
  let statusOrder = 0;

  for (const jiraStatus of uniqueJiraStatuses) {
    const normalizedName = jiraStatus.name.toLowerCase().trim();
    const mapped = STATUS_CATEGORY_MAP[normalizedName];
    const tracklyName = mapped?.name ?? jiraStatus.name;
    const tracklyColor = mapped?.color ?? '#6B7280';
    const tracklyOrder = mapped?.order ?? statusOrder++;

    if (!createdStatusNames.has(tracklyName)) {
      const status = await prisma.status.create({
        data: {
          name: tracklyName,
          color: tracklyColor,
          order: tracklyOrder,
          projectId: tracklyProject.id,
        },
      });
      createdStatusNames.set(tracklyName, status.id);
      stats.statuses++;
    }

    statusMapping.set(jiraStatus.name, createdStatusNames.get(tracklyName)!);
  }

  // Ensure we have at least a default "To Do" status
  if (createdStatusNames.size === 0) {
    const defaultStatus = await prisma.status.create({
      data: {
        name: 'To Do',
        color: '#6B7280',
        order: 0,
        projectId: tracklyProject.id,
      },
    });
    createdStatusNames.set('To Do', defaultStatus.id);
    stats.statuses++;
  }

  const fallbackStatusId = createdStatusNames.values().next().value!;
  console.log(`[JiraImport]   Created ${stats.statuses} statuses`);

  // ─── Step 5: Map Users ─────────────────────────────────────────────────────

  console.log('[JiraImport] Step 5: Mapping Jira users to Trackly users...');

  const jiraAccountIdToTracklyUserId = new Map<string, string>();
  const processedAccountIds = new Set<string>();

  // Collect all unique Jira users from issues
  for (const issue of allIssues) {
    const users = [issue.fields.assignee, issue.fields.reporter].filter(Boolean);
    for (const jiraUser of users) {
      if (!jiraUser || processedAccountIds.has(jiraUser.accountId)) continue;
      processedAccountIds.add(jiraUser.accountId);

      if (jiraUser.emailAddress) {
        const tracklyUser = await prisma.user.findUnique({
          where: { email: jiraUser.emailAddress },
          select: { id: true },
        });

        if (tracklyUser) {
          jiraAccountIdToTracklyUserId.set(jiraUser.accountId, tracklyUser.id);
          stats.usersMatched++;
          continue;
        }
      }

      // User not found — map to importing user
      jiraAccountIdToTracklyUserId.set(jiraUser.accountId, userId);
      stats.usersMissed++;
      warnings.push(
        `Jira user "${jiraUser.displayName}" (${jiraUser.emailAddress ?? 'no email'}) not found in Trackly. Mapped to importing user.`,
      );
    }
  }

  console.log(
    `[JiraImport]   Matched ${stats.usersMatched} users, ${stats.usersMissed} mapped to importing user`,
  );

  // ─── Step 6: Create Sprints ────────────────────────────────────────────────

  console.log('[JiraImport] Step 6: Creating sprints...');

  const jiraSprintIdToTracklyId = new Map<number, string>();

  // If no sprints were fetched from the board, extract from issues
  if (jiraSprints.length === 0) {
    const sprintSet = new Map<number, JiraSprint>();
    for (const issue of allIssues) {
      // Check all sprint sources: standard field + custom field array
      const sprintsToProcess: JiraSprint[] = [];

      if (issue.fields.sprint) {
        sprintsToProcess.push(issue.fields.sprint);
      }

      const customSprints = issue.fields.customfield_10512;
      if (Array.isArray(customSprints)) {
        sprintsToProcess.push(...customSprints);
      }

      for (const s of sprintsToProcess) {
        if (s && s.id && !sprintSet.has(s.id)) {
          sprintSet.set(s.id, s);
        }
      }
    }
    jiraSprints = Array.from(sprintSet.values());
  }

  for (const jiraSprint of jiraSprints) {
    const sprint = await prisma.sprint.create({
      data: {
        name: jiraSprint.name,
        goal: jiraSprint.goal ?? null,
        startDate: jiraSprint.startDate ? new Date(jiraSprint.startDate) : null,
        endDate: jiraSprint.endDate ?? jiraSprint.completeDate
          ? new Date((jiraSprint.endDate ?? jiraSprint.completeDate)!)
          : null,
        status: mapSprintState(jiraSprint.state),
        projectId: tracklyProject.id,
      },
    });

    jiraSprintIdToTracklyId.set(jiraSprint.id, sprint.id);
    stats.sprints++;
  }

  console.log(`[JiraImport]   Created ${stats.sprints} sprints`);

  // ─── Step 7: Create Epics first ────────────────────────────────────────────

  console.log('[JiraImport] Step 7: Creating epics...');

  const jiraKeyToTracklyId = new Map<string, string>();
  let issueNumber = 0;

  const epicIssues = allIssues.filter(
    (issue) => issue.fields.issuetype.name.toLowerCase() === 'epic',
  );

  for (const epic of epicIssues) {
    issueNumber++;
    const resolvedAssigneeId = resolveUserId(
      epic.fields.assignee?.accountId,
      jiraAccountIdToTracklyUserId,
      userId,
    );
    const resolvedReporterId = resolveUserId(
      epic.fields.reporter?.accountId,
      jiraAccountIdToTracklyUserId,
      userId,
    );
    const resolvedStatusId = statusMapping.get(epic.fields.status.name) ?? fallbackStatusId;
    const storyPoints = extractStoryPoints(epic.fields);
    const epicSprint = extractSprint(epic.fields);
    const resolvedSprintId = epicSprint ? (jiraSprintIdToTracklyId.get(epicSprint.id) ?? null) : null;

    const tracklyIssue = await prisma.issue.create({
      data: {
        title: epic.fields.summary,
        description: adfToPlainText(epic.fields.description),
        type: IssueType.EPIC,
        priority: mapPriority(epic.fields.priority?.name ?? 'Medium'),
        number: issueNumber,
        storyPoints,
        statusId: resolvedStatusId,
        projectId: tracklyProject.id,
        assigneeId: resolvedAssigneeId,
        reporterId: resolvedReporterId,
        sprintId: resolvedSprintId,
        dueDate: epic.fields.duedate ? new Date(epic.fields.duedate) : null,
        order: issueNumber,
        createdAt: new Date(epic.fields.created),
        updatedAt: new Date(epic.fields.updated),
      },
    });

    jiraKeyToTracklyId.set(epic.key, tracklyIssue.id);
    stats.epics++;
  }

  console.log(`[JiraImport]   Created ${stats.epics} epics`);

  // ─── Step 8: Create all other Issues ───────────────────────────────────────

  console.log('[JiraImport] Step 8: Creating issues...');

  const nonEpicIssues = allIssues.filter(
    (issue) => issue.fields.issuetype.name.toLowerCase() !== 'epic',
  );

  for (const issue of nonEpicIssues) {
    issueNumber++;
    const resolvedAssigneeId = resolveUserId(
      issue.fields.assignee?.accountId,
      jiraAccountIdToTracklyUserId,
      userId,
    );
    const resolvedReporterId = resolveUserId(
      issue.fields.reporter?.accountId,
      jiraAccountIdToTracklyUserId,
      userId,
    );
    const resolvedStatusId = statusMapping.get(issue.fields.status.name) ?? fallbackStatusId;
    const storyPoints = extractStoryPoints(issue.fields);

    // Resolve sprint from standard or custom field
    const issueSprint = extractSprint(issue.fields);
    const resolvedSprintId = issueSprint ? (jiraSprintIdToTracklyId.get(issueSprint.id) ?? null) : null;

    // Resolve epic parent — walk up parent chain to find an epic
    let resolvedEpicId: string | null = null;
    if (issue.fields.parent) {
      const parentKey = issue.fields.parent.key;
      if (jiraKeyToTracklyId.has(parentKey)) {
        // Check if parent is an epic
        const parentIsEpic =
          issue.fields.parent.fields?.issuetype?.name?.toLowerCase() === 'epic';
        if (parentIsEpic) {
          resolvedEpicId = jiraKeyToTracklyId.get(parentKey)!;
        } else {
          // Parent is a story/task — check if the parent itself has an epic parent
          // by looking up the parent issue in our allIssues list
          const parentIssue = allIssues.find(i => i.key === parentKey);
          if (parentIssue?.fields.parent) {
            const grandParentKey = parentIssue.fields.parent.key;
            if (jiraKeyToTracklyId.has(grandParentKey)) {
              resolvedEpicId = jiraKeyToTracklyId.get(grandParentKey)!;
            }
          }
        }
      }
    }

    const tracklyIssue = await prisma.issue.create({
      data: {
        title: issue.fields.summary,
        description: adfToPlainText(issue.fields.description),
        type: mapIssueType(issue.fields.issuetype.name),
        priority: mapPriority(issue.fields.priority?.name ?? 'Medium'),
        number: issueNumber,
        storyPoints,
        statusId: resolvedStatusId,
        projectId: tracklyProject.id,
        assigneeId: resolvedAssigneeId,
        reporterId: resolvedReporterId,
        sprintId: resolvedSprintId,
        epicId: resolvedEpicId,
        dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : null,
        order: issueNumber,
        createdAt: new Date(issue.fields.created),
        updatedAt: new Date(issue.fields.updated),
      },
    });

    jiraKeyToTracklyId.set(issue.key, tracklyIssue.id);
    stats.issues++;
  }

  console.log(`[JiraImport]   Created ${stats.issues} issues (non-epic)`);

  // ─── Step 9: Create Comments ───────────────────────────────────────────────

  console.log('[JiraImport] Step 9: Creating comments...');

  for (const issue of allIssues) {
    const tracklyIssueId = jiraKeyToTracklyId.get(issue.key);
    if (!tracklyIssueId) continue;

    // Use comments from the search results first (already fetched)
    const comments = issue.fields.comment?.comments ?? [];

    for (const comment of comments) {
      const authorId = resolveUserId(
        comment.author?.accountId,
        jiraAccountIdToTracklyUserId,
        userId,
      );

      const content = adfToPlainText(comment.body);
      if (!content.trim()) continue;

      await prisma.comment.create({
        data: {
          content,
          issueId: tracklyIssueId,
          authorId,
          createdAt: new Date(comment.created),
        },
      });

      stats.comments++;
    }
  }

  console.log(`[JiraImport]   Created ${stats.comments} comments`);

  // ─── Step 10: Create Issue Links ───────────────────────────────────────────

  console.log('[JiraImport] Step 10: Creating issue links...');

  const createdLinks = new Set<string>(); // Prevent duplicate links

  for (const issue of allIssues) {
    const sourceTracklyId = jiraKeyToTracklyId.get(issue.key);
    if (!sourceTracklyId) continue;

    for (const link of issue.fields.issuelinks ?? []) {
      let targetKey: string | undefined;
      let linkType: IssueLinkType;

      if (link.outwardIssue) {
        targetKey = link.outwardIssue.key;
        linkType = mapIssueLinkType(link.type.name, 'outward');
      } else if (link.inwardIssue) {
        targetKey = link.inwardIssue.key;
        linkType = mapIssueLinkType(link.type.name, 'inward');
      } else {
        continue;
      }

      const targetTracklyId = jiraKeyToTracklyId.get(targetKey);
      if (!targetTracklyId) continue;

      // Deduplicate: create canonical key
      const linkKey = [sourceTracklyId, targetTracklyId, linkType].sort().join(':');
      if (createdLinks.has(linkKey)) continue;
      createdLinks.add(linkKey);

      try {
        await prisma.issueLink.create({
          data: {
            type: linkType,
            sourceIssueId: sourceTracklyId,
            targetIssueId: targetTracklyId,
          },
        });
        stats.links++;
      } catch {
        // Unique constraint violation — link already exists, skip
      }
    }
  }

  console.log(`[JiraImport]   Created ${stats.links} issue links`);

  // ─── Step 11: Create Labels ────────────────────────────────────────────────

  console.log('[JiraImport] Step 11: Creating labels...');

  const labelNameToId = new Map<string, string>();
  let labelColorIndex = 0;

  // Collect all unique labels
  for (const issue of allIssues) {
    for (const labelName of issue.fields.labels ?? []) {
      if (!labelNameToId.has(labelName)) {
        const label = await prisma.label.create({
          data: {
            name: labelName,
            color: getLabelColor(labelColorIndex++),
            projectId: tracklyProject.id,
          },
        });
        labelNameToId.set(labelName, label.id);
        stats.labels++;
      }
    }
  }

  // Create IssueLabel associations
  for (const issue of allIssues) {
    const tracklyIssueId = jiraKeyToTracklyId.get(issue.key);
    if (!tracklyIssueId) continue;

    for (const labelName of issue.fields.labels ?? []) {
      const labelId = labelNameToId.get(labelName);
      if (!labelId) continue;

      try {
        await prisma.issueLabel.create({
          data: {
            issueId: tracklyIssueId,
            labelId,
          },
        });
      } catch {
        // Unique constraint violation — already associated, skip
      }
    }
  }

  console.log(`[JiraImport]   Created ${stats.labels} labels`);

  // ─── Step 12: Create Activity Logs ─────────────────────────────────────────

  console.log('[JiraImport] Step 12: Creating activity logs...');

  const activityData = allIssues
    .map((issue) => {
      const tracklyIssueId = jiraKeyToTracklyId.get(issue.key);
      if (!tracklyIssueId) return null;
      return {
        action: 'CREATED',
        field: null,
        oldValue: null,
        newValue: `Imported from Jira (${issue.key})`,
        issueId: tracklyIssueId,
        userId,
        createdAt: new Date(issue.fields.created),
      };
    })
    .filter(Boolean) as Array<{
      action: string;
      field: string | null;
      oldValue: string | null;
      newValue: string;
      issueId: string;
      userId: string;
      createdAt: Date;
    }>;

  if (activityData.length > 0) {
    await prisma.activityLog.createMany({
      data: activityData,
    });
  }

  console.log(`[JiraImport]   Created ${activityData.length} activity logs`);

  // ─── Complete ──────────────────────────────────────────────────────────────

  const result: ImportResult = {
    projectId: tracklyProject.id,
    projectName: tracklyProject.name,
    projectKey: tracklyProject.key,
    stats,
    warnings,
  };

  console.log('[JiraImport] Import completed successfully!');
  console.log(`[JiraImport] Stats: ${JSON.stringify(stats, null, 2)}`);

  return result;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Collects unique statuses from Jira's per-issue-type status list.
 */
function collectUniqueStatuses(
  issueTypesWithStatuses: JiraIssueTypeWithStatuses[],
): JiraStatus[] {
  const seen = new Set<string>();
  const unique: JiraStatus[] = [];

  for (const issueType of issueTypesWithStatuses) {
    for (const status of issueType.statuses) {
      if (!seen.has(status.name)) {
        seen.add(status.name);
        unique.push(status);
      }
    }
  }

  return unique;
}

/**
 * Resolves a Jira account ID to a Trackly user ID, falling back to the importing user.
 */
function resolveUserId(
  jiraAccountId: string | undefined,
  mapping: Map<string, string>,
  fallbackUserId: string,
): string {
  if (!jiraAccountId) return fallbackUserId;
  return mapping.get(jiraAccountId) ?? fallbackUserId;
}

/**
 * Extracts story points from various Jira custom field locations.
 */
function extractStoryPoints(fields: JiraIssue['fields']): number | null {
  const candidates = [
    fields.story_points,
    fields.customfield_10013,
    fields.customfield_10016,
  ];
  for (const val of candidates) {
    if (val != null && typeof val === 'number' && val > 0) {
      return val;
    }
  }
  return null;
}

/**
 * Extracts the most relevant sprint from Jira issue fields.
 * Sprint can be in `sprint` (single) or `customfield_10512` (array).
 * If array, picks the active sprint, or the last one.
 */
function extractSprint(fields: JiraIssue['fields']): JiraSprint | null {
  // Check standard sprint field first
  if (fields.sprint) {
    return fields.sprint;
  }

  // Check custom field (array of sprints)
  const sprintArray = fields.customfield_10512;
  if (Array.isArray(sprintArray) && sprintArray.length > 0) {
    // Prefer active sprint, otherwise take the last one
    const active = sprintArray.find(s => s.state === 'active');
    if (active) return active;
    return sprintArray[sprintArray.length - 1];
  }

  return null;
}
