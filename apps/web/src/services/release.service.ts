import api from './api';
import type { ApiResponse } from '@/types';

export interface ReleaseWithProgress {
  id: string;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'IN_PROGRESS' | 'RELEASED' | 'ARCHIVED';
  startDate: string | null;
  releaseDate: string | null;
  projectId: string;
  createdAt: string;
  _count: { issues: number };
  progress: { total: number; done: number };
  issues?: Array<{
    id: string;
    title: string;
    number: number;
    type: string;
    priority: string;
    status: { id: string; name: string; color: string };
    assignee: { id: string; name: string; avatar: string | null } | null;
  }>;
}

export const releaseService = {
  async list(projectId: string): Promise<ReleaseWithProgress[]> {
    const response = await api.get<ApiResponse<ReleaseWithProgress[]>>('/releases', { params: { projectId } });
    return response.data.data;
  },

  async create(data: {
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
    projectId: string;
  }): Promise<ReleaseWithProgress> {
    const response = await api.post<ApiResponse<ReleaseWithProgress>>('/releases', data);
    return response.data.data;
  },

  async get(id: string): Promise<ReleaseWithProgress> {
    const response = await api.get<ApiResponse<ReleaseWithProgress>>(`/releases/${id}`);
    return response.data.data;
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string;
      releaseDate?: string;
    }
  ): Promise<ReleaseWithProgress> {
    const response = await api.put<ApiResponse<ReleaseWithProgress>>(`/releases/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/releases/${id}`);
  },

  async addIssue(releaseId: string, issueId: string): Promise<void> {
    await api.post(`/releases/${releaseId}/issues`, { issueId });
  },

  async removeIssue(releaseId: string, issueId: string): Promise<void> {
    await api.delete(`/releases/${releaseId}/issues/${issueId}`);
  },
};
