import type { Label } from '@/types';
import { PROJECT_TRK_ID, PROJECT_DS_ID } from './projects';

export const labels: Label[] = [
  // Trackly App labels
  { id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID },
  { id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID },
  { id: 'lbl-003', name: 'urgent', color: '#EF4444', projectId: PROJECT_TRK_ID },
  { id: 'lbl-004', name: 'ux', color: '#8B5CF6', projectId: PROJECT_TRK_ID },
  { id: 'lbl-005', name: 'performance', color: '#F59E0B', projectId: PROJECT_TRK_ID },
  { id: 'lbl-006', name: 'tech-debt', color: '#6B7280', projectId: PROJECT_TRK_ID },

  // Design System labels
  { id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID },
  { id: 'lbl-102', name: 'tokens', color: '#8B5CF6', projectId: PROJECT_DS_ID },
  { id: 'lbl-103', name: 'docs', color: '#F59E0B', projectId: PROJECT_DS_ID },
  { id: 'lbl-104', name: 'a11y', color: '#10B981', projectId: PROJECT_DS_ID },
];
