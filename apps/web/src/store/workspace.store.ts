import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],

      setCurrentWorkspace: (workspace) =>
        set({ currentWorkspace: workspace }),

      setWorkspaces: (workspaces) => set({ workspaces }),

      clearWorkspace: () =>
        set({ currentWorkspace: null, workspaces: [] }),
    }),
    {
      name: 'trackly-workspace',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
