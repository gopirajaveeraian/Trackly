import type { ProjectStatus } from '@/types';
import { PROJECT_TRK_ID, PROJECT_DS_ID } from './projects';

export const statuses: ProjectStatus[] = [
  // Trackly App statuses
  { id: 'st-trk-1', name: 'To Do', color: '#6B7280', order: 0, projectId: PROJECT_TRK_ID },
  { id: 'st-trk-2', name: 'In Progress', color: '#3B82F6', order: 1, projectId: PROJECT_TRK_ID },
  { id: 'st-trk-3', name: 'In Review', color: '#F59E0B', order: 2, projectId: PROJECT_TRK_ID },
  { id: 'st-trk-4', name: 'Done', color: '#10B981', order: 3, projectId: PROJECT_TRK_ID },

  // Design System statuses
  { id: 'st-ds-1', name: 'Backlog', color: '#6B7280', order: 0, projectId: PROJECT_DS_ID },
  { id: 'st-ds-2', name: 'In Progress', color: '#3B82F6', order: 1, projectId: PROJECT_DS_ID },
  { id: 'st-ds-3', name: 'Review', color: '#F59E0B', order: 2, projectId: PROJECT_DS_ID },
  { id: 'st-ds-4', name: 'Done', color: '#10B981', order: 3, projectId: PROJECT_DS_ID },
];
