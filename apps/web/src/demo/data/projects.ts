import type { Project } from '@/types';
import { ProjectType } from '@/types';
import { WORKSPACE_ID } from './users';

export const PROJECT_TRK_ID = 'proj-001';
export const PROJECT_DS_ID = 'proj-002';

export const projects: Project[] = [
  {
    id: PROJECT_TRK_ID,
    name: 'Trackly App',
    key: 'TRK',
    type: ProjectType.SCRUM,
    description: 'Main product — project management and issue tracking platform. Scrum-based development with two-week sprints.',
    workspaceId: WORKSPACE_ID,
    createdAt: '2025-10-01T09:00:00.000Z',
  },
  {
    id: PROJECT_DS_ID,
    name: 'Design System',
    key: 'DS',
    type: ProjectType.KANBAN,
    description: 'Shared UI component library and design tokens. Kanban workflow for continuous delivery.',
    workspaceId: WORKSPACE_ID,
    createdAt: '2025-10-10T10:00:00.000Z',
  },
];
