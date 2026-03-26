export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  userId: string;
  issueId?: string;
  read: boolean;
  createdAt: string;
}

export enum NotificationType {
  ASSIGNED = 'ASSIGNED',
  MENTIONED = 'MENTIONED',
  COMMENT = 'COMMENT',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DUE_DATE = 'DUE_DATE',
}
