import { getDemoStore } from '../store';
import { DEMO_USER_ID } from '../data/users';

export function handleIssues(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /issues
  if (method === 'GET' && segments.length === 0) {
    let filtered = [...store.issues];

    const projectId = params.get('projectId');
    const sprintId = params.get('sprintId');
    const statusId = params.get('statusId');
    const assigneeId = params.get('assigneeId');
    const type = params.get('type');
    const priority = params.get('priority');
    const search = params.get('search');

    if (projectId) filtered = filtered.filter((i) => i.projectId === projectId);
    if (sprintId) filtered = filtered.filter((i) => i.sprintId === sprintId);
    if (statusId) filtered = filtered.filter((i) => i.statusId === statusId);
    if (assigneeId) filtered = filtered.filter((i) => i.assigneeId === assigneeId);
    if (type) filtered = filtered.filter((i) => i.type === type);
    if (priority) filtered = filtered.filter((i) => i.priority === priority);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q)
      );
    }

    // Return as array — the service wraps it in PaginatedResponse
    return filtered;
  }

  // POST /issues
  if (method === 'POST' && segments.length === 0) {
    const labelIds = (body.labelIds as string[] | undefined) ?? [];
    const issueLabels = store.labels.filter((l) => labelIds.includes(l.id));
    return store.createIssue({ ...body, labels: issueLabels } as Parameters<typeof store.createIssue>[0]);
  }

  const id = segments[0];

  // GET /issues/:id/comments
  if (method === 'GET' && segments[1] === 'comments') {
    return store.comments.filter((c) => c.issueId === id);
  }

  // POST /issues/:id/comments
  if (method === 'POST' && segments[1] === 'comments') {
    return store.addComment(id, (body as { content: string }).content);
  }

  // GET /issues/:id/activity
  if (method === 'GET' && segments[1] === 'activity') {
    return store.activities.get(id) ?? [];
  }

  // POST /issues/:id/links
  if (method === 'POST' && segments[1] === 'links') {
    const targetId = body.targetIssueId as string;
    const linkType = body.type as string;
    const target = store.issues.find((i) => i.id === targetId);
    if (!target) return null;

    const linkId = 'link-' + Math.random().toString(36).slice(2, 11);
    const link = {
      id: linkId,
      type: linkType,
      sourceIssueId: id,
      targetIssueId: targetId,
      linkedIssue: {
        id: target.id,
        title: target.title,
        number: target.number,
        type: target.type,
        priority: target.priority,
        status: target.status,
        project: { key: store.projects.find((p) => p.id === target.projectId)?.key ?? '' },
      },
      createdAt: new Date().toISOString(),
    };
    const issue = store.issues.find((i) => i.id === id);
    if (issue) {
      if (!issue.links) issue.links = [];
      issue.links.push(link as typeof issue.links[number]);
    }
    return link;
  }

  // DELETE /issues/:id/links/:linkId
  if (method === 'DELETE' && segments[1] === 'links' && segments[2]) {
    const issue = store.issues.find((i) => i.id === id);
    if (issue?.links) {
      issue.links = issue.links.filter((l) => l.id !== segments[2]);
    }
    return { success: true };
  }

  // POST /issues/:id/watchers
  if (method === 'POST' && segments[1] === 'watchers') {
    const userId = body.userId as string;
    const user = store.getUser(userId);
    const watcher = {
      id: 'w-' + Math.random().toString(36).slice(2, 11),
      userId,
      issueId: id,
      user: { id: userId, name: user?.name ?? 'Unknown', avatar: user?.avatar ?? null },
    };
    const issue = store.issues.find((i) => i.id === id);
    if (issue) {
      if (!issue.watchers) issue.watchers = [];
      issue.watchers.push(watcher);
    }
    return watcher;
  }

  // DELETE /issues/:id/watchers/:userId
  if (method === 'DELETE' && segments[1] === 'watchers' && segments[2]) {
    const issue = store.issues.find((i) => i.id === id);
    if (issue?.watchers) {
      issue.watchers = issue.watchers.filter((w) => w.userId !== segments[2]);
    }
    return { success: true };
  }

  // POST /issues/:id/time-logs
  if (method === 'POST' && segments[1] === 'time-logs') {
    const user = store.getDemoUser();
    const timeLog = {
      id: 'tl-' + Math.random().toString(36).slice(2, 11),
      hours: body.hours as number,
      description: (body.description as string) ?? null,
      issueId: id,
      userId: DEMO_USER_ID,
      user: { id: user.id, name: user.name, avatar: user.avatar },
      loggedAt: (body.loggedAt as string) ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const issue = store.issues.find((i) => i.id === id);
    if (issue) {
      if (!issue.timeLogs) issue.timeLogs = [];
      issue.timeLogs.push(timeLog);
      issue.timeSpent = (issue.timeSpent ?? 0) + timeLog.hours;
    }
    return timeLog;
  }

  // DELETE /issues/:id/time-logs/:logId
  if (method === 'DELETE' && segments[1] === 'time-logs' && segments[2]) {
    const issue = store.issues.find((i) => i.id === id);
    if (issue?.timeLogs) {
      const log = issue.timeLogs.find((t) => t.id === segments[2]);
      if (log) {
        issue.timeSpent = (issue.timeSpent ?? 0) - log.hours;
        issue.timeLogs = issue.timeLogs.filter((t) => t.id !== segments[2]);
      }
    }
    return { success: true };
  }

  // PATCH /issues/:id/status
  if (method === 'PATCH' && segments[1] === 'status') {
    return store.updateIssue(id, { statusId: body.statusId });
  }

  // GET /issues/:id
  if (method === 'GET' && segments.length === 1) {
    return store.issues.find((i) => i.id === id) ?? null;
  }

  // PUT /issues/:id
  if (method === 'PUT' && segments.length === 1) {
    return store.updateIssue(id, body);
  }

  // DELETE /issues/:id
  if (method === 'DELETE' && segments.length === 1) {
    store.deleteIssue(id);
    return { success: true };
  }

  return null;
}
