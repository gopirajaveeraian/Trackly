import type {
  Issue,
  Comment,
  Notification,
  Sprint,
  ProjectStatus,
  Project,
  Workspace,
  Label,
  Attachment,
  WorkspaceMember,
} from '@/types';
import type { DemoUser, DemoWorkspaceMember } from './data/users';
import { users, workspaceMembers, DEMO_USER_ID } from './data/users';
import { workspaces } from './data/workspace';
import { projects } from './data/projects';
import { statuses } from './data/statuses';
import { sprints } from './data/sprints';
import { issues } from './data/issues';
import { comments } from './data/comments';
import { notifications } from './data/notifications';
import { labels } from './data/labels';
import type { ActivityItem } from '@/types';

function uid(): string {
  return 'demo-' + Math.random().toString(36).slice(2, 11);
}

function now(): string {
  return new Date().toISOString();
}

export class DemoStore {
  users: DemoUser[];
  workspaceMembers: DemoWorkspaceMember[];
  workspaces: Workspace[];
  projects: Project[];
  statuses: ProjectStatus[];
  sprints: Sprint[];
  issues: Issue[];
  comments: Comment[];
  notifications: Notification[];
  labels: Label[];
  attachments: Attachment[];
  activities: Map<string, ActivityItem[]>;

  private issueCounters: Map<string, number> = new Map();

  constructor() {
    this.users = structuredClone(users);
    this.workspaceMembers = structuredClone(workspaceMembers);
    this.workspaces = structuredClone(workspaces);
    this.projects = structuredClone(projects);
    this.statuses = structuredClone(statuses);
    this.sprints = structuredClone(sprints);
    this.issues = structuredClone(issues);
    this.comments = structuredClone(comments);
    this.notifications = structuredClone(notifications);
    this.labels = structuredClone(labels);
    this.attachments = [];

    // Build activity logs from existing data
    this.activities = new Map();
    for (const issue of this.issues) {
      this.activities.set(issue.id, this.buildActivityLog(issue));
    }

    // Initialize issue number counters per project
    for (const project of this.projects) {
      const projectIssues = this.issues.filter((i) => i.projectId === project.id);
      const maxNumber = projectIssues.reduce((max, i) => Math.max(max, i.number), 0);
      this.issueCounters.set(project.id, maxNumber);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  getUser(id: string): DemoUser | undefined {
    return this.users.find((u) => u.id === id);
  }

  getDemoUser(): DemoUser {
    return this.users.find((u) => u.id === DEMO_USER_ID)!;
  }

  nextIssueNumber(projectId: string): number {
    const current = this.issueCounters.get(projectId) ?? 0;
    const next = current + 1;
    this.issueCounters.set(projectId, next);
    return next;
  }

  getStatus(id: string): ProjectStatus | undefined {
    return this.statuses.find((s) => s.id === id);
  }

  // ─── Activity Log Builder ──────────────────────────────────────────────

  private buildActivityLog(issue: Issue): ActivityItem[] {
    const reporter = this.getUser(issue.reporterId);
    const items: ActivityItem[] = [
      {
        id: uid(),
        type: 'created',
        message: `${reporter?.name ?? 'Someone'} created this issue`,
        timestamp: issue.createdAt,
        user: { name: reporter?.name ?? 'Unknown', avatar: reporter?.avatar ?? null },
        issueId: issue.id,
        issueTitle: issue.title,
      },
    ];

    if (issue.assigneeId) {
      const assignee = this.getUser(issue.assigneeId);
      items.push({
        id: uid(),
        type: 'assigned',
        message: `Assigned to ${assignee?.name ?? 'someone'}`,
        timestamp: issue.createdAt,
        user: { name: reporter?.name ?? 'Unknown', avatar: reporter?.avatar ?? null },
        issueId: issue.id,
        issueTitle: issue.title,
      });
    }

    if (issue.status.name !== 'To Do' && issue.status.name !== 'Backlog') {
      items.push({
        id: uid(),
        type: 'status_changed',
        message: `Status changed to ${issue.status.name}`,
        timestamp: issue.updatedAt,
        user: { name: issue.assignee?.name ?? reporter?.name ?? 'Unknown', avatar: issue.assignee?.avatar ?? null },
        issueId: issue.id,
        issueTitle: issue.title,
      });
    }

    return items;
  }

  addActivity(issueId: string, type: ActivityItem['type'], message: string, userId?: string): void {
    const user = this.getUser(userId ?? DEMO_USER_ID);
    const existing = this.activities.get(issueId) ?? [];
    existing.push({
      id: uid(),
      type,
      message,
      timestamp: now(),
      user: { name: user?.name ?? 'Unknown', avatar: user?.avatar ?? null },
      issueId,
    });
    this.activities.set(issueId, existing);
  }

  // ─── Issue Mutations ───────────────────────────────────────────────────

  createIssue(data: Partial<Issue> & { projectId: string; statusId: string; title: string }): Issue {
    const project = this.projects.find((p) => p.id === data.projectId);
    const status = this.getStatus(data.statusId)!;
    const reporter = this.getDemoUser();
    const assignee = data.assigneeId ? this.getUser(data.assigneeId) ?? null : null;
    const number = this.nextIssueNumber(data.projectId);
    const sprint = data.sprintId ? this.sprints.find((s) => s.id === data.sprintId) : null;
    const epic = data.epicId ? this.issues.find((i) => i.id === data.epicId) : null;
    const issueLabels = data.labels ?? [];

    const issue: Issue = {
      id: uid(),
      title: data.title,
      description: data.description ?? null,
      type: data.type ?? 'TASK' as Issue['type'],
      priority: data.priority ?? 'MEDIUM' as Issue['priority'],
      number,
      storyPoints: data.storyPoints ?? null,
      estimate: data.estimate ?? null,
      timeSpent: null,
      statusId: data.statusId,
      status,
      projectId: data.projectId,
      project: project ? { id: project.id, name: project.name, key: project.key } : undefined,
      assigneeId: data.assigneeId ?? null,
      assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatar: assignee.avatar, createdAt: assignee.createdAt } : null,
      reporterId: DEMO_USER_ID,
      reporter: { id: reporter.id, name: reporter.name, email: reporter.email, avatar: reporter.avatar, createdAt: reporter.createdAt },
      sprintId: data.sprintId ?? null,
      sprint: sprint ? { id: sprint.id, name: sprint.name, status: sprint.status } : null,
      epicId: data.epicId ?? null,
      epic: epic ? { id: epic.id, title: epic.title, number: epic.number } : null,
      subTasks: [],
      labels: issueLabels,
      links: [],
      watchers: [],
      timeLogs: [],
      dueDate: data.dueDate ?? null,
      createdAt: now(),
      updatedAt: now(),
    };

    this.issues.push(issue);
    this.addActivity(issue.id, 'created', `${reporter.name} created this issue`);
    return issue;
  }

  updateIssue(id: string, data: Record<string, unknown>): Issue | null {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) return null;

    if (data.statusId !== undefined) {
      const status = this.getStatus(data.statusId as string);
      if (status) {
        issue.statusId = status.id;
        issue.status = status;
        this.addActivity(id, 'status_changed', `Status changed to ${status.name}`);
      }
    }
    if (data.title !== undefined) issue.title = data.title as string;
    if (data.description !== undefined) issue.description = data.description as string | null;
    if (data.type !== undefined) issue.type = data.type as Issue['type'];
    if (data.priority !== undefined) issue.priority = data.priority as Issue['priority'];
    if (data.assigneeId !== undefined) {
      const newAssigneeId = data.assigneeId as string | null;
      issue.assigneeId = newAssigneeId;
      if (newAssigneeId) {
        const assignee = this.getUser(newAssigneeId);
        issue.assignee = assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatar: assignee.avatar, createdAt: assignee.createdAt } : null;
        this.addActivity(id, 'assigned', `Assigned to ${assignee?.name ?? 'someone'}`);
      } else {
        issue.assignee = null;
        this.addActivity(id, 'assigned', 'Unassigned');
      }
    }
    if (data.sprintId !== undefined) {
      issue.sprintId = data.sprintId as string | null;
      if (issue.sprintId) {
        const sprint = this.sprints.find((s) => s.id === issue.sprintId);
        issue.sprint = sprint ? { id: sprint.id, name: sprint.name, status: sprint.status } : null;
      } else {
        issue.sprint = null;
      }
    }
    if (data.epicId !== undefined) {
      issue.epicId = data.epicId as string | null;
      if (issue.epicId) {
        const epic = this.issues.find((i) => i.id === issue.epicId);
        issue.epic = epic ? { id: epic.id, title: epic.title, number: epic.number } : null;
      } else {
        issue.epic = null;
      }
    }
    if (data.dueDate !== undefined) issue.dueDate = data.dueDate as string | null;
    if (data.storyPoints !== undefined) issue.storyPoints = data.storyPoints as number | null;
    if (data.estimate !== undefined) issue.estimate = data.estimate as number | null;
    if (data.labelIds !== undefined) {
      const labelIds = data.labelIds as string[];
      issue.labels = this.labels.filter((l) => labelIds.includes(l.id));
    }

    issue.updatedAt = now();
    return issue;
  }

  deleteIssue(id: string): boolean {
    const idx = this.issues.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.issues.splice(idx, 1);
    this.comments = this.comments.filter((c) => c.issueId !== id);
    this.activities.delete(id);
    return true;
  }

  // ─── Comment Mutations ─────────────────────────────────────────────────

  addComment(issueId: string, content: string): Comment {
    const author = this.getDemoUser();
    const comment: Comment = {
      id: uid(),
      content,
      issueId,
      authorId: author.id,
      author: { id: author.id, name: author.name, email: author.email, avatar: author.avatar, createdAt: author.createdAt },
      createdAt: now(),
    };
    this.comments.push(comment);
    this.addActivity(issueId, 'commented', `${author.name} commented`);
    return comment;
  }

  // ─── Sprint Mutations ──────────────────────────────────────────────────

  createSprint(data: { name: string; goal?: string; startDate?: string; endDate?: string; projectId: string }): Sprint {
    const sprint: Sprint = {
      id: uid(),
      name: data.name,
      goal: data.goal ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: 'PLANNED' as Sprint['status'],
      projectId: data.projectId,
    };
    this.sprints.push(sprint);
    return sprint;
  }

  updateSprint(id: string, data: Record<string, unknown>): Sprint | null {
    const sprint = this.sprints.find((s) => s.id === id);
    if (!sprint) return null;
    if (data.name !== undefined) sprint.name = data.name as string;
    if (data.goal !== undefined) sprint.goal = data.goal as string | null;
    if (data.startDate !== undefined) sprint.startDate = data.startDate as string | null;
    if (data.endDate !== undefined) sprint.endDate = data.endDate as string | null;
    return sprint;
  }

  startSprint(id: string): Sprint | null {
    const sprint = this.sprints.find((s) => s.id === id);
    if (!sprint) return null;
    sprint.status = 'ACTIVE' as Sprint['status'];
    if (!sprint.startDate) sprint.startDate = now();
    return sprint;
  }

  completeSprint(id: string): Sprint | null {
    const sprint = this.sprints.find((s) => s.id === id);
    if (!sprint) return null;
    sprint.status = 'COMPLETED' as Sprint['status'];
    if (!sprint.endDate) sprint.endDate = now();
    return sprint;
  }

  // ─── Notification Mutations ────────────────────────────────────────────

  markNotificationRead(id: string): Notification | null {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return null;
    notif.read = true;
    return notif;
  }

  markAllNotificationsRead(): number {
    let count = 0;
    for (const notif of this.notifications) {
      if (!notif.read) {
        notif.read = true;
        count++;
      }
    }
    return count;
  }

  // ─── Workspace Mutations ───────────────────────────────────────────────

  createWorkspace(data: { name: string; slug: string }): Workspace {
    const ws: Workspace = {
      id: uid(),
      name: data.name,
      slug: data.slug,
      createdAt: now(),
    };
    this.workspaces.push(ws);
    return ws;
  }

  updateWorkspace(id: string, data: Record<string, unknown>): Workspace | null {
    const ws = this.workspaces.find((w) => w.id === id);
    if (!ws) return null;
    if (data.name !== undefined) ws.name = data.name as string;
    if (data.slug !== undefined) ws.slug = data.slug as string;
    return ws;
  }

  // ─── Project Mutations ─────────────────────────────────────────────────

  createProject(data: { name: string; key: string; type: string; description?: string; workspaceId: string }): Project {
    const project: Project = {
      id: uid(),
      name: data.name,
      key: data.key,
      type: data.type as Project['type'],
      description: data.description ?? null,
      workspaceId: data.workspaceId,
      createdAt: now(),
    };
    this.projects.push(project);

    // Create default statuses
    const defaultStatuses = [
      { name: 'To Do', color: '#6B7280', order: 0 },
      { name: 'In Progress', color: '#3B82F6', order: 1 },
      { name: 'In Review', color: '#F59E0B', order: 2 },
      { name: 'Done', color: '#10B981', order: 3 },
    ];
    for (const s of defaultStatuses) {
      this.statuses.push({
        id: uid(),
        name: s.name,
        color: s.color,
        order: s.order,
        projectId: project.id,
      });
    }

    this.issueCounters.set(project.id, 0);
    return project;
  }

  updateProject(id: string, data: Record<string, unknown>): Project | null {
    const project = this.projects.find((p) => p.id === id);
    if (!project) return null;
    if (data.name !== undefined) project.name = data.name as string;
    if (data.description !== undefined) project.description = data.description as string | null;
    if (data.type !== undefined) project.type = data.type as Project['type'];
    return project;
  }

  deleteProject(id: string): boolean {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.projects.splice(idx, 1);
    this.issues = this.issues.filter((i) => i.projectId !== id);
    this.statuses = this.statuses.filter((s) => s.projectId !== id);
    this.sprints = this.sprints.filter((s) => s.projectId !== id);
    this.labels = this.labels.filter((l) => l.projectId !== id);
    return true;
  }

  // ─── Status Mutations ──────────────────────────────────────────────────

  createStatus(projectId: string, data: { name: string; color: string; order: number }): ProjectStatus {
    const status: ProjectStatus = {
      id: uid(),
      name: data.name,
      color: data.color,
      order: data.order,
      projectId,
    };
    this.statuses.push(status);
    return status;
  }

  // ─── Label Mutations ───────────────────────────────────────────────────

  createLabel(projectId: string, data: { name: string; color: string }): Label {
    const label: Label = {
      id: uid(),
      name: data.name,
      color: data.color,
      projectId,
    };
    this.labels.push(label);
    return label;
  }

  deleteLabel(projectId: string, labelId: string): boolean {
    const idx = this.labels.findIndex((l) => l.id === labelId && l.projectId === projectId);
    if (idx === -1) return false;
    this.labels.splice(idx, 1);
    return true;
  }

  // ─── Attachment Mutations ──────────────────────────────────────────────

  addAttachment(issueId: string, filename: string): Attachment {
    const attachment: Attachment = {
      id: uid(),
      filename,
      url: `https://demo.trackly.app/uploads/${filename}`,
      issueId,
      createdAt: now(),
    };
    this.attachments.push(attachment);
    return attachment;
  }

  deleteAttachment(id: string): boolean {
    const idx = this.attachments.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.attachments.splice(idx, 1);
    return true;
  }

  // ─── Workspace Members (read) ──────────────────────────────────────────

  getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    return this.workspaceMembers
      .filter((m) => m.workspaceId === workspaceId)
      .map((m) => ({
        id: m.id,
        userId: m.userId,
        workspaceId: m.workspaceId,
        role: m.role,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          createdAt: m.user.createdAt,
        },
      }));
  }
}

// Singleton instance
let store: DemoStore | null = null;

export function getDemoStore(): DemoStore {
  if (!store) {
    store = new DemoStore();
  }
  return store;
}
