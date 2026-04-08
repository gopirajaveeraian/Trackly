import api from './api';
import type { ApiResponse } from '@/types';

export interface RoadmapItem {
  id: string;
  name: string;
  type: 'epic' | 'release';
  startDate: string | null;
  endDate: string | null;
  progress: { total: number; done: number };
  color: string;
  status?: string;
}

export interface RoadmapData {
  epics: RoadmapItem[];
  releases: RoadmapItem[];
}

export const roadmapService = {
  async get(projectId: string): Promise<RoadmapData> {
    const response = await api.get<ApiResponse<RoadmapData>>('/roadmap', { params: { projectId } });
    return response.data.data;
  },
};
