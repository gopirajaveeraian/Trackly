import api from './api';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatus,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export const projectService = {
  async list(workspaceId: string): Promise<PaginatedResponse<Project>> {
    const response = await api.get<ApiResponse<Project[]>>(
      '/projects',
      { params: { workspaceId } }
    );
    const projects = response.data.data;
    return {
      data: projects,
      total: projects.length,
      page: 1,
      limit: projects.length,
      hasMore: false,
    };
  },

  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>('/projects', data);
    return response.data.data;
  },

  async get(id: string): Promise<Project> {
    const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data.data;
  },

  async update(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await api.patch<ApiResponse<Project>>(
      `/projects/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async getStatuses(projectId: string): Promise<ProjectStatus[]> {
    const response = await api.get<ApiResponse<ProjectStatus[]>>(
      `/projects/${projectId}/statuses`
    );
    return response.data.data;
  },

  async createStatus(
    projectId: string,
    data: { name: string; color: string; order: number }
  ): Promise<ProjectStatus> {
    const response = await api.post<ApiResponse<ProjectStatus>>(
      `/projects/${projectId}/statuses`,
      data
    );
    return response.data.data;
  },
};
