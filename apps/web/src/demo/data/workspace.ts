import type { Workspace } from '@/types';
import { WORKSPACE_ID } from './users';

export const workspaces: Workspace[] = [
  {
    id: WORKSPACE_ID,
    name: 'Acme Engineering',
    slug: 'acme-engineering',
    createdAt: '2025-09-15T08:00:00.000Z',
  },
];
