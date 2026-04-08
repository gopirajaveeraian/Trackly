import api from './api';
import type { ApiResponse } from '@/types';

export interface JiraImportRequest {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
  workspaceId: string;
}

export interface JiraImportStats {
  statuses: number;
  sprints: number;
  epics: number;
  issues: number;
  comments: number;
  labels: number;
  links: number;
  usersMatched: number;
  usersMissed: number;
}

export interface JiraImportResult {
  projectId: string;
  projectName: string;
  projectKey: string;
  stats: JiraImportStats;
  warnings: string[];
}

/**
 * Service for importing projects from Jira into Trackly.
 * Sends connection credentials and project key to the backend,
 * which handles the full import and returns statistics.
 */
export const jiraImportService = {
  async importProject(data: JiraImportRequest): Promise<JiraImportResult> {
    const response = await api.post<ApiResponse<JiraImportResult>>('/jira-import', data);
    return response.data.data;
  },
};
