import { getDemoStore } from '../store';

export function handleSprints(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /sprints
  if (method === 'GET' && segments.length === 0) {
    const projectId = params.get('projectId');
    return projectId
      ? store.sprints.filter((s) => s.projectId === projectId)
      : store.sprints;
  }

  // POST /sprints
  if (method === 'POST' && segments.length === 0) {
    return store.createSprint(body as { name: string; goal?: string; startDate?: string; endDate?: string; projectId: string });
  }

  const id = segments[0];

  // POST /sprints/:id/start
  if (method === 'POST' && segments[1] === 'start') {
    return store.startSprint(id);
  }

  // POST /sprints/:id/complete
  if (method === 'POST' && segments[1] === 'complete') {
    return store.completeSprint(id);
  }

  // GET /sprints/:id
  if (method === 'GET' && segments.length === 1) {
    return store.sprints.find((s) => s.id === id) ?? null;
  }

  // PATCH /sprints/:id
  if (method === 'PATCH' && segments.length === 1) {
    return store.updateSprint(id, body);
  }

  return null;
}
