import { IssueType, Priority, IssueLinkType } from './enums';
import { User } from './user';
import { ProjectStatus } from './project';

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface IssueLink {
  id: string;
  type: IssueLinkType;
  sourceIssueId: string;
  targetIssueId: string;
  linkedIssue: {
    id: string;
    title: string;
    number: number;
    type: IssueType;
    priority: Priority;
    status: ProjectStatus;
    project: { key: string };
  };
  createdAt: string;
}

export interface Watcher {
  id: string;
  userId: string;
  issueId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface TimeLog {
  id: string;
  hours: number;
  description: string | null;
  issueId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  loggedAt: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  type: IssueType;
  priority: Priority;
  number: number;
  storyPoints: number | null;
  estimate: number | null;
  timeSpent: number | null;
  statusId: string;
  status: ProjectStatus;
  projectId: string;
  project?: { id: string; name: string; key: string };
  assigneeId: string | null;
  assignee: User | null;
  reporterId: string;
  reporter: User;
  sprintId: string | null;
  sprint?: { id: string; name: string; status: string } | null;
  epicId: string | null;
  epic?: { id: string; title: string; number: number } | null;
  subTasks?: { id: string; title: string; number: number; type: IssueType; priority: Priority; status: ProjectStatus }[];
  labels?: Label[];
  links?: IssueLink[];
  watchers?: Watcher[];
  timeLogs?: TimeLog[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  type: IssueType;
  priority: Priority;
  statusId: string;
  projectId: string;
  assigneeId?: string;
  sprintId?: string;
  epicId?: string;
  dueDate?: string;
  storyPoints?: number;
  estimate?: number;
  labelIds?: string[];
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: Priority;
  statusId?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  epicId?: string | null;
  dueDate?: string | null;
  storyPoints?: number | null;
  estimate?: number | null;
  labelIds?: string[];
}

export interface IssueFilters {
  projectId?: string;
  sprintId?: string;
  status?: string;
  assignee?: string;
  type?: IssueType;
  priority?: Priority;
  search?: string;
}

export interface CreateIssueLinkRequest {
  type: IssueLinkType;
  targetIssueId: string;
}

export interface CreateTimeLinkRequest {
  hours: number;
  description?: string;
  loggedAt?: string;
}

export interface CreateLabelRequest {
  name: string;
  color: string;
}
