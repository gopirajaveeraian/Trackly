import { ReleaseStatus } from './enums';

export interface Release {
  id: string;
  name: string;
  description: string | null;
  status: ReleaseStatus;
  startDate: string | null;
  releaseDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { issues: number };
  progress?: { total: number; done: number };
}

export interface CreateReleaseRequest {
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  projectId: string;
}

export interface UpdateReleaseRequest {
  name?: string;
  description?: string;
  status?: ReleaseStatus;
  startDate?: string;
  releaseDate?: string;
}
