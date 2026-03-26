import { getDemoStore } from '../store';

export function handleWorkspaces(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /workspaces
  if (method === 'GET' && segments.length === 0) {
    return store.workspaces;
  }

  // POST /workspaces
  if (method === 'POST' && segments.length === 0) {
    return store.createWorkspace(body as { name: string; slug: string });
  }

  const id = segments[0];

  // GET /workspaces/:id/members
  if (method === 'GET' && segments[1] === 'members') {
    return store.getWorkspaceMembers(id);
  }

  // POST /workspaces/:id/invite
  if (method === 'POST' && segments[1] === 'invite') {
    return { success: true };
  }

  // GET /workspaces/:id
  if (method === 'GET') {
    return store.workspaces.find((w) => w.id === id) ?? store.workspaces[0];
  }

  // PATCH /workspaces/:id
  if (method === 'PATCH') {
    return store.updateWorkspace(id, body) ?? store.workspaces[0];
  }

  return null;
}
