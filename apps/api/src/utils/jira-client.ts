/**
 * Jira Cloud REST API client.
 *
 * Wraps Jira Cloud REST API v3 and Agile API calls using Node 18+ built-in fetch.
 * Handles authentication (Basic Auth), pagination, and rate limiting with retries.
 */

// ─── Jira Response Types ───────────────────────────────────────────────────────

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  style?: string;
}

export interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
  colorName: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraIssueTypeWithStatuses {
  id: string;
  name: string;
  statuses: JiraStatus[];
}

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
}

export interface JiraPriority {
  id: string;
  name: string;
}

export interface JiraIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

export interface JiraIssueLink {
  id: string;
  type: JiraIssueLinkType;
  inwardIssue?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      issuetype: JiraIssueType;
    };
  };
  outwardIssue?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      issuetype: JiraIssueType;
    };
  };
}

export interface JiraComment {
  id: string;
  body: JiraAdfNode;
  author: JiraUser;
  created: string;
  updated: string;
}

export interface JiraAdfNode {
  type: string;
  text?: string;
  content?: JiraAdfNode[];
  attrs?: Record<string, unknown>;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'future' | 'active' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
  originBoardId?: number;
}

export interface JiraIssueFields {
  summary: string;
  description: JiraAdfNode | null;
  issuetype: JiraIssueType;
  priority: JiraPriority;
  status: JiraStatus;
  assignee: JiraUser | null;
  reporter: JiraUser | null;
  created: string;
  updated: string;
  duedate: string | null;
  // Story points — varies by instance
  story_points?: number | null;
  customfield_10016?: number | null;
  customfield_10013?: number | null;
  // Sprint — standard or custom field (can be single or array)
  sprint?: JiraSprint | null;
  customfield_10512?: JiraSprint[] | null;
  labels: string[];
  comment: {
    comments: JiraComment[];
    total: number;
  };
  issuelinks: JiraIssueLink[];
  parent?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      issuetype: JiraIssueType;
    };
  };
  resolution: { name: string } | null;
  fixVersions: Array<{ id: string; name: string }>;
  // Catch-all for unknown custom fields
  [key: string]: unknown;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
  /** Legacy fields — may not be present on new /search/jql endpoint */
  startAt?: number;
  maxResults?: number;
  total?: number;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban' | 'simple';
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

export interface JiraBoardResponse {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: JiraBoard[];
}

export interface JiraSprintResponse {
  maxResults: number;
  startAt: number;
  isLast: boolean;
  values: JiraSprint[];
}

export interface JiraCommentResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}

// ─── Client ────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const SEARCH_PAGE_SIZE = 100;
const SPRINT_PAGE_SIZE = 50;

/**
 * Jira Cloud REST API client.
 * Uses Basic Auth (email:apiToken base64 encoded) for authentication.
 */
export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Makes an authenticated request to the Jira API with retry logic for rate limiting.
   */
  private async request<T>(url: string, options?: { method?: string; body?: string }, retryCount = 0): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      method: options?.method ?? 'GET',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...(options?.body ? { body: options.body } : {}),
    });

    // Handle rate limiting (HTTP 429)
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);

      console.log(`[JiraClient] Rate limited. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await this.sleep(delayMs);
      return this.request<T>(url, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No error body');
      throw new Error(
        `Jira API error: ${response.status} ${response.statusText} — ${errorBody}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── API Methods ───────────────────────────────────────────────────────────

  /**
   * Fetches a Jira project by key.
   *
   * @param projectKey - The Jira project key (e.g., "TRK")
   * @returns The Jira project details
   */
  async getProject(projectKey: string): Promise<JiraProject> {
    console.log(`[JiraClient] Fetching project: ${projectKey}`);
    return this.request<JiraProject>(`/rest/api/3/project/${projectKey}`);
  }

  /**
   * Fetches all statuses for a Jira project, grouped by issue type.
   *
   * @param projectKey - The Jira project key
   * @returns Array of issue types with their available statuses
   */
  async getStatuses(projectKey: string): Promise<JiraIssueTypeWithStatuses[]> {
    console.log(`[JiraClient] Fetching statuses for project: ${projectKey}`);
    return this.request<JiraIssueTypeWithStatuses[]>(
      `/rest/api/3/project/${projectKey}/statuses`,
    );
  }

  /**
   * Searches for issues using JQL with pagination support.
   *
   * @param jql - JQL query string
   * @param startAt - Pagination offset
   * @param maxResults - Maximum results per page
   * @returns Search results with issue data
   */
  async searchIssues(
    jql: string,
    maxResults: number = SEARCH_PAGE_SIZE,
    nextPageToken?: string,
  ): Promise<JiraSearchResponse> {
    const payload: Record<string, unknown> = {
      jql,
      maxResults,
      fields: [
        'summary',
        'description',
        'issuetype',
        'priority',
        'status',
        'assignee',
        'reporter',
        'created',
        'updated',
        'duedate',
        'story_points',
        'customfield_10013',
        'customfield_10016',
        'sprint',
        'customfield_10512',
        'labels',
        'comment',
        'issuelinks',
        'parent',
        'resolution',
        'fixVersions',
      ],
    };

    if (nextPageToken) {
      payload.nextPageToken = nextPageToken;
    }

    return this.request<JiraSearchResponse>(
      '/rest/api/3/search/jql',
      { method: 'POST', body: JSON.stringify(payload) },
    );
  }

  /**
   * Fetches all issues for a project using token-based pagination.
   *
   * @param projectKey - The Jira project key
   * @returns All issues in the project
   */
  async getAllProjectIssues(projectKey: string): Promise<JiraIssue[]> {
    const jql = `project = ${projectKey} ORDER BY created ASC`;
    const allIssues: JiraIssue[] = [];

    console.log(`[JiraClient] Fetching all issues for project: ${projectKey}`);

    let nextPageToken: string | undefined;
    let pageNum = 0;

    do {
      const page = await this.searchIssues(jql, SEARCH_PAGE_SIZE, nextPageToken);
      allIssues.push(...page.issues);
      nextPageToken = page.nextPageToken;
      pageNum++;

      console.log(`[JiraClient] Page ${pageNum}: fetched ${page.issues.length} issues (total so far: ${allIssues.length})`);

      if (page.issues.length === 0 || page.isLast) {
        break;
      }
    } while (nextPageToken);

    console.log(`[JiraClient] Fetched all ${allIssues.length} issues`);
    return allIssues;
  }

  /**
   * Fetches sprints for a given board, automatically handling pagination.
   *
   * @param boardId - The Jira board ID
   * @returns All sprints for the board
   */
  async getSprints(boardId: number): Promise<JiraSprint[]> {
    console.log(`[JiraClient] Fetching sprints for board: ${boardId}`);
    const allSprints: JiraSprint[] = [];
    let startAt = 0;
    let isLast = false;

    while (!isLast) {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: SPRINT_PAGE_SIZE.toString(),
      });

      const response = await this.request<JiraSprintResponse>(
        `/rest/agile/1.0/board/${boardId}/sprint?${params.toString()}`,
      );

      allSprints.push(...response.values);
      isLast = response.isLast;
      startAt += response.values.length;

      console.log(`[JiraClient] Fetched ${allSprints.length} sprints (isLast: ${isLast})`);

      if (response.values.length === 0) {
        break; // Safety valve
      }
    }

    return allSprints;
  }

  /**
   * Finds a board for a given project key. Tries scrum first, then kanban, then any.
   *
   * @param projectKey - The Jira project key
   * @returns The first matching board, or null if none found
   */
  async getBoard(projectKey: string): Promise<JiraBoard | null> {
    console.log(`[JiraClient] Fetching board for project: ${projectKey}`);

    // Try scrum board first
    for (const boardType of ['scrum', 'kanban'] as const) {
      try {
        const params = new URLSearchParams({
          projectKeyOrId: projectKey,
          type: boardType,
        });

        const response = await this.request<JiraBoardResponse>(
          `/rest/agile/1.0/board?${params.toString()}`,
        );

        if (response.values.length > 0) {
          console.log(`[JiraClient] Found ${boardType} board: ${response.values[0].name}`);
          return response.values[0];
        }
      } catch {
        // Board type not found, try next
      }
    }

    // Try without type filter
    try {
      const params = new URLSearchParams({
        projectKeyOrId: projectKey,
      });

      const response = await this.request<JiraBoardResponse>(
        `/rest/agile/1.0/board?${params.toString()}`,
      );

      if (response.values.length > 0) {
        console.log(`[JiraClient] Found board: ${response.values[0].name} (type: ${response.values[0].type})`);
        return response.values[0];
      }
    } catch {
      // No board found
    }

    console.log(`[JiraClient] No board found for project: ${projectKey}`);
    return null;
  }

  /**
   * Fetches all comments for a specific issue.
   *
   * @param issueKey - The Jira issue key (e.g., "TRK-1")
   * @returns All comments on the issue
   */
  async getComments(issueKey: string): Promise<JiraComment[]> {
    const allComments: JiraComment[] = [];
    let startAt = 0;

    while (true) {
      const params = new URLSearchParams({
        startAt: startAt.toString(),
        maxResults: '100',
      });

      const response = await this.request<JiraCommentResponse>(
        `/rest/api/3/issue/${issueKey}/comment?${params.toString()}`,
      );

      allComments.push(...response.comments);
      startAt += response.comments.length;

      if (startAt >= response.total || response.comments.length === 0) {
        break;
      }
    }

    return allComments;
  }
}

// ─── ADF Helpers ───────────────────────────────────────────────────────────────

/**
 * Converts a Jira ADF (Atlassian Document Format) node to plain text.
 * Recursively extracts text content, joining paragraphs with newlines.
 *
 * @param node - ADF node (or null)
 * @returns Plain text representation
 */
export function adfToPlainText(node: JiraAdfNode | null | undefined): string {
  if (!node) return '';

  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (!node.content || node.content.length === 0) {
    return '';
  }

  const childTexts = node.content.map((child) => adfToPlainText(child));

  // Insert newlines between block-level elements
  const blockTypes = new Set([
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
    'rule',
    'table',
    'mediaSingle',
    'panel',
  ]);

  if (blockTypes.has(node.type)) {
    return childTexts.join('') + '\n';
  }

  if (node.type === 'listItem') {
    return '- ' + childTexts.join('') + '\n';
  }

  if (node.type === 'hardBreak') {
    return '\n';
  }

  // For doc and other container types, join with newlines between block children
  if (node.type === 'doc') {
    return childTexts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  return childTexts.join('');
}
