export enum Role {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export enum IssueType {
  BUG = 'BUG',
  STORY = 'STORY',
  TASK = 'TASK',
  EPIC = 'EPIC',
  SUBTASK = 'SUBTASK',
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ProjectType {
  SCRUM = 'SCRUM',
  KANBAN = 'KANBAN',
}

export enum SprintStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum IssueLinkType {
  BLOCKS = 'BLOCKS',
  IS_BLOCKED_BY = 'IS_BLOCKED_BY',
  RELATES_TO = 'RELATES_TO',
  DUPLICATES = 'DUPLICATES',
}
