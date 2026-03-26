import type { Sprint } from '@/types';
import { SprintStatus } from '@/types';
import { PROJECT_TRK_ID } from './projects';

export const sprints: Sprint[] = [
  {
    id: 'spr-001',
    name: 'Sprint 1 — Foundation',
    goal: 'Set up authentication, database schema, and basic project structure',
    startDate: '2026-02-17T00:00:00.000Z',
    endDate: '2026-02-28T23:59:59.000Z',
    status: SprintStatus.COMPLETED,
    projectId: PROJECT_TRK_ID,
  },
  {
    id: 'spr-002',
    name: 'Sprint 2 — Core Features',
    goal: 'Implement board view, issue CRUD, and drag-and-drop functionality',
    startDate: '2026-03-03T00:00:00.000Z',
    endDate: '2026-03-14T23:59:59.000Z',
    status: SprintStatus.ACTIVE,
    projectId: PROJECT_TRK_ID,
  },
  {
    id: 'spr-003',
    name: 'Sprint 3 — Polish & Reports',
    goal: 'Add reporting dashboards, search, and performance improvements',
    startDate: '2026-03-17T00:00:00.000Z',
    endDate: '2026-03-28T23:59:59.000Z',
    status: SprintStatus.PLANNED,
    projectId: PROJECT_TRK_ID,
  },
];
