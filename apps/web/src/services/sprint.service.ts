import api from './api';
import type {
  Sprint,
  CreateSprintRequest,
  UpdateSprintRequest,
  ApiResponse,
} from '@/types';

export const sprintService = {
  async list(projectId: string): Promise<Sprint[]> {
    const response = await api.get<ApiResponse<Sprint[]>>('/sprints', {
      params: { projectId },
    });
    return response.data.data;
  },

  async create(data: CreateSprintRequest): Promise<Sprint> {
    const response = await api.post<ApiResponse<Sprint>>('/sprints', data);
    return response.data.data;
  },

  async get(id: string): Promise<Sprint> {
    const response = await api.get<ApiResponse<Sprint>>(`/sprints/${id}`);
    return response.data.data;
  },

  async update(id: string, data: UpdateSprintRequest): Promise<Sprint> {
    const response = await api.patch<ApiResponse<Sprint>>(
      `/sprints/${id}`,
      data
    );
    return response.data.data;
  },

  async start(id: string): Promise<Sprint> {
    const response = await api.post<ApiResponse<Sprint>>(
      `/sprints/${id}/start`
    );
    return response.data.data;
  },

  async complete(id: string): Promise<Sprint> {
    const response = await api.post<ApiResponse<Sprint>>(
      `/sprints/${id}/complete`
    );
    return response.data.data;
  },
};
