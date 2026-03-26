import api from './api';
import type {
  Workspace,
  CreateWorkspaceRequest,
  InviteMemberRequest,
  WorkspaceMember,
  ApiResponse,
} from '@/types';

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const response = await api.get<ApiResponse<Workspace[]>>('/workspaces');
    return response.data.data;
  },

  async create(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await api.post<ApiResponse<Workspace>>(
      '/workspaces',
      data
    );
    return response.data.data;
  },

  async get(id: string): Promise<Workspace> {
    const response = await api.get<ApiResponse<Workspace>>(
      `/workspaces/${id}`
    );
    return response.data.data;
  },

  async update(
    id: string,
    data: Partial<CreateWorkspaceRequest>
  ): Promise<Workspace> {
    const response = await api.patch<ApiResponse<Workspace>>(
      `/workspaces/${id}`,
      data
    );
    return response.data.data;
  },

  async invite(workspaceId: string, data: InviteMemberRequest): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/invite`, data);
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await api.get<ApiResponse<WorkspaceMember[]>>(
      `/workspaces/${workspaceId}/members`
    );
    return response.data.data;
  },
};
