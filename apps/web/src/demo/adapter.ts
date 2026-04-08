import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { handleAuth } from './handlers/auth';
import { handleWorkspaces } from './handlers/workspaces';
import { handleProjects } from './handlers/projects';
import { handleIssues } from './handlers/issues';
import { handleSprints } from './handlers/sprints';
import { handleNotifications } from './handlers/notifications';
import { handleAttachments } from './handlers/attachments';
import { getDemoStore } from './store';

/**
 * Adds a fake network delay (50-150ms) for realistic feel.
 */
function delay(): Promise<void> {
  const ms = 50 + Math.random() * 100;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a request URL into the resource path and query params.
 * Handles both absolute URLs (http://...) and relative paths (/api/...).
 */
function parseUrl(url: string, baseURL?: string): { segments: string[]; params: URLSearchParams } {
  let pathname: string;
  let search: string;

  try {
    // Handle absolute URLs
    const fullUrl = url.startsWith('http') ? url : `${baseURL ?? ''}${url}`;
    const parsed = new URL(fullUrl, 'http://localhost');
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    // Fallback: manual parse
    const [path, qs] = url.split('?');
    pathname = path;
    search = qs ? `?${qs}` : '';
  }

  // Strip /api prefix
  const clean = pathname.replace(/^\/api/, '');
  const segments = clean.split('/').filter(Boolean);
  const params = new URLSearchParams(search);

  return { segments, params };
}

/**
 * Extract request body from the Axios config.
 * Handles JSON strings, objects, and FormData.
 */
function extractBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (!config.data) return {};

  // FormData (file uploads)
  if (config.data instanceof FormData) {
    const obj: Record<string, unknown> = {};
    config.data.forEach((value, key) => {
      if (value instanceof File) {
        obj[key] = value;
        obj.filename = value.name;
      } else {
        obj[key] = value;
      }
    });
    return obj;
  }

  // JSON string
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }

  // Already an object
  return config.data;
}

/**
 * Route request to the correct handler based on the first path segment.
 */
function route(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams): unknown {
  const resource = segments[0];
  const rest = segments.slice(1);

  switch (resource) {
    case 'auth':
      return handleAuth(method, rest, body);
    case 'workspaces':
      return handleWorkspaces(method, rest, body, params);
    case 'projects':
      return handleProjects(method, rest, body, params);
    case 'issues':
      return handleIssues(method, rest, body, params);
    case 'sprints':
      return handleSprints(method, rest, body, params);
    case 'notifications':
      return handleNotifications(method, rest, body, params);
    case 'attachments':
      return handleAttachments(method, rest, body, params);
    case 'search': {
      const store = getDemoStore();
      const q = (params.get('q') ?? '').toLowerCase();
      if (!q) return [];
      return store.issues.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
      );
    }
    case 'jira-import':
      return {
        projectId: 'demo-proj-1',
        projectName: 'Demo Import',
        projectKey: 'DEMO',
        stats: { statuses: 4, sprints: 2, epics: 3, issues: 25, comments: 10, labels: 5, links: 8, usersMatched: 3, usersMissed: 1 },
        warnings: ['Demo mode: no actual Jira connection was made.'],
      };
    case 'reports':
      return handleReports(rest, params);
    default:
      console.warn(`[Demo] Unhandled route: ${method} /${segments.join('/')}`);
      return null;
  }
}

/**
 * Handle report endpoints by computing data from the store.
 * Returns data matching the backend report API response shapes.
 */
function handleReports(segments: string[], params: URLSearchParams): unknown {
  const store = getDemoStore();
  const reportType = segments[0];
  const DONE_NAMES = ['done', 'completed', 'closed'];

  if (reportType === 'burndown') {
    const sprintId = params.get('sprintId');
    const sprint = store.sprints.find((s) => s.id === sprintId);
    if (!sprint?.startDate || !sprint?.endDate) {
      return {
        sprint: sprint ? { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate, status: sprint.status } : null,
        data: [],
        totalPoints: 0,
      };
    }

    const sprintIssues = store.issues.filter((i) => i.sprintId === sprintId);
    const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const data = [];
    for (let d = 0; d <= days; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + d);
      const idealRemaining = totalPoints - (totalPoints / days) * d;
      const jitter = d < days / 2 ? 2 : -1;
      const remaining = Math.max(0, Math.round((idealRemaining + jitter) * 10) / 10);
      data.push({
        date: date.toISOString().slice(0, 10),
        ideal: Math.round(idealRemaining * 10) / 10,
        remaining,
      });
    }
    return {
      sprint: { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate, status: sprint.status },
      data,
      totalPoints,
    };
  }

  if (reportType === 'velocity') {
    return store.sprints
      .filter((s) => s.status === 'COMPLETED' || s.status === 'ACTIVE')
      .map((sprint) => {
        const sprintIssues = store.issues.filter((i) => i.sprintId === sprint.id);
        const completed = sprintIssues
          .filter((i) => DONE_NAMES.includes(i.status.name.toLowerCase()))
          .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
        const committed = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
        return { sprintId: sprint.id, sprintName: sprint.name, committed, completed };
      });
  }

  if (reportType === 'workload') {
    const projectId = params.get('projectId');
    const projectIssues = (projectId
      ? store.issues.filter((i) => i.projectId === projectId)
      : store.issues
    ).filter((i) => !DONE_NAMES.includes(i.status.name.toLowerCase()));

    const workloadMap = new Map<string | null, { name: string; avatar: string | null; issueCount: number; storyPoints: number }>();
    for (const issue of projectIssues) {
      const key = issue.assigneeId ?? null;
      const entry = workloadMap.get(key) ?? {
        name: issue.assignee?.name ?? 'Unassigned',
        avatar: issue.assignee?.avatar ?? null,
        issueCount: 0,
        storyPoints: 0,
      };
      entry.issueCount++;
      entry.storyPoints += issue.storyPoints ?? 0;
      workloadMap.set(key, entry);
    }
    return Array.from(workloadMap.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));
  }

  if (reportType === 'status-summary') {
    const projectId = params.get('projectId');
    const projectIssues = projectId
      ? store.issues.filter((i) => i.projectId === projectId)
      : store.issues;

    const statusMap = new Map<string, { statusName: string; color: string; issueCount: number; storyPoints: number }>();
    for (const issue of projectIssues) {
      const entry = statusMap.get(issue.statusId) ?? {
        statusName: issue.status.name,
        color: issue.status.color,
        issueCount: 0,
        storyPoints: 0,
      };
      entry.issueCount++;
      entry.storyPoints += issue.storyPoints ?? 0;
      statusMap.set(issue.statusId, entry);
    }
    return Array.from(statusMap.entries()).map(([statusId, data]) => ({
      statusId,
      ...data,
    }));
  }

  return [];
}

/**
 * Build a mock AxiosResponse wrapping the data in { success: true, data: ... } shape.
 */
function buildResponse(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  // Issue list endpoint returns hasMore/nextCursor at top level
  const isIssueList =
    config.method === 'get' &&
    config.url?.includes('/issues') &&
    !config.url?.includes('/issues/') &&
    Array.isArray(data);

  const responseData = isIssueList
    ? { success: true, data, hasMore: false, nextCursor: null }
    : { success: true, data };

  return {
    data: responseData,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  };
}

/**
 * Custom Axios adapter that intercepts all requests and routes to demo handlers.
 */
export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await delay();

  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  const { segments, params } = parseUrl(url, config.baseURL);
  const body = extractBody(config);

  // Merge params from config.params
  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
  }

  const data = route(method, segments, body, params);
  return buildResponse(data, config);
}
