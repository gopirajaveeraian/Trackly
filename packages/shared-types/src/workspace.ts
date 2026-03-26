import { WorkspaceMember } from './user';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members?: WorkspaceMember[];
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
}

export interface InviteMemberRequest {
  email: string;
  role: string;
}
