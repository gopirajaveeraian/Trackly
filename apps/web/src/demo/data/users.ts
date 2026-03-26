import { Role } from '@/types';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface DemoWorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
  user: DemoUser;
}

export const DEMO_USER_ID = 'usr-001';

export const users: DemoUser[] = [
  {
    id: 'usr-001',
    name: 'Alex Morgan',
    email: 'alex@acme.dev',
    avatar: null,
    createdAt: '2025-09-15T08:00:00.000Z',
  },
  {
    id: 'usr-002',
    name: 'Sarah Chen',
    email: 'sarah@acme.dev',
    avatar: null,
    createdAt: '2025-09-16T10:30:00.000Z',
  },
  {
    id: 'usr-003',
    name: 'Marcus Johnson',
    email: 'marcus@acme.dev',
    avatar: null,
    createdAt: '2025-09-17T09:15:00.000Z',
  },
  {
    id: 'usr-004',
    name: 'Priya Patel',
    email: 'priya@acme.dev',
    avatar: null,
    createdAt: '2025-09-18T11:00:00.000Z',
  },
  {
    id: 'usr-005',
    name: 'James Wilson',
    email: 'james@acme.dev',
    avatar: null,
    createdAt: '2025-09-20T14:00:00.000Z',
  },
];

export const WORKSPACE_ID = 'ws-001';

export const workspaceMembers: DemoWorkspaceMember[] = [
  { id: 'wm-001', userId: 'usr-001', workspaceId: WORKSPACE_ID, role: Role.ADMIN, user: users[0] },
  { id: 'wm-002', userId: 'usr-002', workspaceId: WORKSPACE_ID, role: Role.PROJECT_MANAGER, user: users[1] },
  { id: 'wm-003', userId: 'usr-003', workspaceId: WORKSPACE_ID, role: Role.DEVELOPER, user: users[2] },
  { id: 'wm-004', userId: 'usr-004', workspaceId: WORKSPACE_ID, role: Role.DEVELOPER, user: users[3] },
  { id: 'wm-005', userId: 'usr-005', workspaceId: WORKSPACE_ID, role: Role.VIEWER, user: users[4] },
];
