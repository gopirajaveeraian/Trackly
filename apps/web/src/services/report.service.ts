import api from './api';
import type { ApiResponse } from '@/types';

// ─── Report API Types ──────────────────────────────────────────────────────

export interface BurndownDataPoint {
  date: string;
  ideal: number;
  remaining: number;
}

export interface BurndownResponse {
  sprint: {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  data: BurndownDataPoint[];
  totalPoints: number;
}

export interface VelocityEntry {
  sprintId: string;
  sprintName: string;
  committed: number;
  completed: number;
}

export interface WorkloadEntry {
  userId: string | null;
  name: string;
  avatar: string | null;
  issueCount: number;
  storyPoints: number;
}

export interface StatusSummaryEntry {
  statusId: string;
  statusName: string;
  color: string;
  issueCount: number;
  storyPoints: number;
}

// ─── Report Service ────────────────────────────────────────────────────────

export const reportService = {
  async getBurndown(sprintId: string): Promise<BurndownResponse> {
    const response = await api.get<ApiResponse<BurndownResponse>>(
      '/reports/burndown',
      { params: { sprintId } }
    );
    return response.data.data;
  },

  async getVelocity(projectId: string): Promise<VelocityEntry[]> {
    const response = await api.get<ApiResponse<VelocityEntry[]>>(
      '/reports/velocity',
      { params: { projectId } }
    );
    return response.data.data;
  },

  async getWorkload(projectId: string): Promise<WorkloadEntry[]> {
    const response = await api.get<ApiResponse<WorkloadEntry[]>>(
      '/reports/workload',
      { params: { projectId } }
    );
    return response.data.data;
  },

  async getStatusSummary(projectId: string): Promise<StatusSummaryEntry[]> {
    const response = await api.get<ApiResponse<StatusSummaryEntry[]>>(
      '/reports/status-summary',
      { params: { projectId } }
    );
    return response.data.data;
  },
};
