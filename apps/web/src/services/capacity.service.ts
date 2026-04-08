import api from './api';
import type { ApiResponse } from '@/types';

export interface CapacityEntry {
  id: string;
  userId: string;
  sprintId: string;
  availableHours: number;
  allocatedHours: number;
  user: { id: string; name: string; avatar: string | null };
}

export const capacityService = {
  async list(sprintId: string): Promise<CapacityEntry[]> {
    const response = await api.get<ApiResponse<CapacityEntry[]>>('/capacities', { params: { sprintId } });
    return response.data.data;
  },

  async upsert(data: { userId: string; sprintId: string; availableHours: number }): Promise<CapacityEntry> {
    const response = await api.post<ApiResponse<CapacityEntry>>('/capacities', data);
    return response.data.data;
  },
};
