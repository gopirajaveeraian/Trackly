import { User } from './user';

export interface Comment {
  id: string;
  content: string;
  issueId: string;
  authorId: string;
  author: User;
  createdAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  issueId: string;
  createdAt: string;
}
