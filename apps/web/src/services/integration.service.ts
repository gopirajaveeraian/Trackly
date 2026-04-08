import api from './api';
import type { ApiResponse } from '@/types';

export interface IntegrationEntry {
  id: string;
  type: 'GITHUB' | 'CONFLUENCE' | 'SLACK' | 'JIRA' | 'BITBUCKET' | 'GITLAB';
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  workspaceId: string;
  createdAt: string;
}

export const integrationService = {
  async list(workspaceId: string): Promise<IntegrationEntry[]> {
    const response = await api.get<ApiResponse<IntegrationEntry[]>>('/integrations', { params: { workspaceId } });
    return response.data.data;
  },

  async create(data: {
    type: string;
    name: string;
    config: Record<string, string>;
    workspaceId: string;
  }): Promise<IntegrationEntry> {
    const response = await api.post<ApiResponse<IntegrationEntry>>('/integrations', data);
    return response.data.data;
  },

  async update(
    id: string,
    data: { name?: string; config?: Record<string, string>; enabled?: boolean }
  ): Promise<IntegrationEntry> {
    const response = await api.put<ApiResponse<IntegrationEntry>>(`/integrations/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(`/integrations/${id}/test`);
    return response.data.data;
  },
};
