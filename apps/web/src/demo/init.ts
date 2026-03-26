import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { getDemoStore } from './store';

/**
 * Auto-populate auth and workspace stores so the app boots
 * directly into the authenticated state with no login required.
 */
export function initDemoState(): void {
  const store = getDemoStore();
  const demoUser = store.getDemoUser();
  const workspace = store.workspaces[0];

  // Set auth store
  useAuthStore.getState().login(
    {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      avatar: demoUser.avatar,
    },
    'demo-access-token',
    'demo-refresh-token'
  );

  // Set workspace store
  useWorkspaceStore.getState().setWorkspaces(store.workspaces);
  useWorkspaceStore.getState().setCurrentWorkspace(workspace);
}
