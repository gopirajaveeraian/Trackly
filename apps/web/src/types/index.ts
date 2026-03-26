import type { Issue as IssueType_ } from '@trackly/shared-types';

// Re-export all shared types
export type {
  // Auth
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  AuthUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  // User
  User,
  WorkspaceMember,
  // Workspace
  Workspace,
  CreateWorkspaceRequest,
  InviteMemberRequest,
  // Project
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStatus,
  // Issue
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  IssueFilters,
  Label,
  IssueLink,
  Watcher,
  TimeLog,
  CreateIssueLinkRequest,
  CreateTimeLinkRequest,
  CreateLabelRequest,
  // Sprint
  Sprint,
  CreateSprintRequest,
  UpdateSprintRequest,
  // Comment
  Comment,
  CreateCommentRequest,
  Attachment,
  // Notification
  Notification,
  // Common
  PaginatedResponse,
  ApiError,
  ApiResponse,
} from '@trackly/shared-types';

export {
  Role,
  IssueType,
  Priority,
  ProjectType,
  SprintStatus,
  NotificationType,
  IssueLinkType,
} from '@trackly/shared-types';

// Frontend-only types

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface DashboardMetric {
  label: string;
  value: number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    isPositive: boolean;
  };
}

export interface ActivityItem {
  id: string;
  type: 'created' | 'updated' | 'commented' | 'status_changed' | 'assigned';
  message: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string | null;
  };
  issueId?: string;
  issueTitle?: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  order: number;
  issues: IssueType_[];
}
