import { getDemoStore } from '../store';

export function handleProjects(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /projects
  if (method === 'GET' && segments.length === 0) {
    const workspaceId = params.get('workspaceId');
    const filtered = workspaceId
      ? store.projects.filter((p) => p.workspaceId === workspaceId)
      : store.projects;
    return filtered;
  }

  // POST /projects
  if (method === 'POST' && segments.length === 0) {
    return store.createProject(body as { name: string; key: string; type: string; description?: string; workspaceId: string });
  }

  const id = segments[0];

  // GET /projects/:id/statuses
  if (method === 'GET' && segments[1] === 'statuses') {
    return store.statuses.filter((s) => s.projectId === id).sort((a, b) => a.order - b.order);
  }

  // POST /projects/:id/statuses
  if (method === 'POST' && segments[1] === 'statuses') {
    return store.createStatus(id, body as { name: string; color: string; order: number });
  }

  // GET /projects/:id/labels
  if (method === 'GET' && segments[1] === 'labels') {
    return store.labels.filter((l) => l.projectId === id);
  }

  // POST /projects/:id/labels
  if (method === 'POST' && segments[1] === 'labels') {
    return store.createLabel(id, body as { name: string; color: string });
  }

  // DELETE /projects/:id/labels/:labelId
  if (method === 'DELETE' && segments[1] === 'labels' && segments[2]) {
    store.deleteLabel(id, segments[2]);
    return { success: true };
  }

  // GET /projects/:id
  if (method === 'GET') {
    return store.projects.find((p) => p.id === id) ?? null;
  }

  // PATCH /projects/:id
  if (method === 'PATCH') {
    return store.updateProject(id, body);
  }

  // DELETE /projects/:id
  if (method === 'DELETE') {
    store.deleteProject(id);
    return { success: true };
  }

  return null;
}
