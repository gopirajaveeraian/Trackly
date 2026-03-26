import api from './api';
import type {
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueFilters,
  Comment,
  CreateCommentRequest,
  ApiResponse,
  PaginatedResponse,
  ActivityItem,
  IssueLink,
  CreateIssueLinkRequest,
  Watcher,
  TimeLog,
  Label,
  CreateLabelRequest,
} from '@/types';

export const issueService = {
  async list(filters: IssueFilters): Promise<PaginatedResponse<Issue>> {
    // Map frontend filter names to API query param names
    const params: Record<string, string | undefined> = {
      projectId: filters.projectId,
      sprintId: filters.sprintId,
      statusId: filters.status,
      assigneeId: filters.assignee,
      type: filters.type,
      priority: filters.priority,
      search: filters.search,
    };
    const response = await api.get<{ success: boolean; data: Issue[]; hasMore?: boolean; nextCursor?: string }>(
      '/issues',
      { params }
    );
    const issues = response.data.data;
    return {
      data: issues,
      total: issues.length,
      page: 1,
      limit: issues.length,
      hasMore: response.data.hasMore ?? false,
    };
  },

  async create(data: CreateIssueRequest): Promise<Issue> {
    const response = await api.post<ApiResponse<Issue>>('/issues', data);
    return response.data.data;
  },

  async get(id: string): Promise<Issue> {
    const response = await api.get<ApiResponse<Issue>>(`/issues/${id}`);
    return response.data.data;
  },

  async update(id: string, data: UpdateIssueRequest): Promise<Issue> {
    const response = await api.put<ApiResponse<Issue>>(
      `/issues/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/issues/${id}`);
  },

  async reorder(id: string, previousOrder: number | null, nextOrder: number | null): Promise<Issue> {
    const response = await api.patch<ApiResponse<Issue>>(
      `/issues/${id}/reorder`,
      { previousOrder, nextOrder }
    );
    return response.data.data;
  },

  async updateStatus(id: string, statusId: string): Promise<Issue> {
    const response = await api.patch<ApiResponse<Issue>>(
      `/issues/${id}/status`,
      { statusId }
    );
    return response.data.data;
  },

  async addComment(issueId: string, data: CreateCommentRequest): Promise<Comment> {
    const response = await api.post<ApiResponse<Comment>>(
      `/issues/${issueId}/comments`,
      data
    );
    return response.data.data;
  },

  async getComments(issueId: string): Promise<Comment[]> {
    const response = await api.get<ApiResponse<Comment[]>>(
      `/issues/${issueId}/comments`
    );
    return response.data.data;
  },

  async getActivity(issueId: string): Promise<ActivityItem[]> {
    const response = await api.get<ApiResponse<ActivityItem[]>>(
      `/issues/${issueId}/activity`
    );
    return response.data.data;
  },

  // ─── Issue Links ────────────────────────────────────────────────────────

  async addLink(issueId: string, data: CreateIssueLinkRequest): Promise<IssueLink> {
    const response = await api.post<ApiResponse<IssueLink>>(
      `/issues/${issueId}/links`,
      data
    );
    return response.data.data;
  },

  async removeLink(issueId: string, linkId: string): Promise<void> {
    await api.delete(`/issues/${issueId}/links/${linkId}`);
  },

  // ─── Watchers ───────────────────────────────────────────────────────────

  async addWatcher(issueId: string, userId: string): Promise<Watcher> {
    const response = await api.post<ApiResponse<Watcher>>(
      `/issues/${issueId}/watchers`,
      { userId }
    );
    return response.data.data;
  },

  async removeWatcher(issueId: string, userId: string): Promise<void> {
    await api.delete(`/issues/${issueId}/watchers/${userId}`);
  },

  // ─── Time Logs ──────────────────────────────────────────────────────────

  async addTimeLog(
    issueId: string,
    data: { hours: number; description?: string; loggedAt?: string }
  ): Promise<TimeLog> {
    const response = await api.post<ApiResponse<TimeLog>>(
      `/issues/${issueId}/time-logs`,
      data
    );
    return response.data.data;
  },

  async removeTimeLog(issueId: string, timeLogId: string): Promise<void> {
    await api.delete(`/issues/${issueId}/time-logs/${timeLogId}`);
  },

  // ─── Labels ─────────────────────────────────────────────────────────────

  async listLabels(projectId: string): Promise<Label[]> {
    const response = await api.get<ApiResponse<Label[]>>(
      `/projects/${projectId}/labels`
    );
    return response.data.data;
  },

  async createLabel(projectId: string, data: CreateLabelRequest): Promise<Label> {
    const response = await api.post<ApiResponse<Label>>(
      `/projects/${projectId}/labels`,
      data
    );
    return response.data.data;
  },

  async deleteLabel(projectId: string, labelId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/labels/${labelId}`);
  },
};
