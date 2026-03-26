import { ProjectType } from './enums';

export interface Project {
  id: string;
  name: string;
  key: string;
  type: ProjectType;
  description: string | null;
  workspaceId: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  type: ProjectType;
  description?: string;
  workspaceId: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
}

export interface ProjectStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  projectId: string;
}
