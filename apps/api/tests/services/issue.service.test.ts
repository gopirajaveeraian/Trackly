import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as issueService from '../../src/services/issue.service';

// Mock Prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
    issue: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: { findMany: vi.fn(), create: vi.fn() },
    activityLog: { findMany: vi.fn(), create: vi.fn() },
    issueLink: { create: vi.fn(), delete: vi.fn() },
    watcher: { create: vi.fn(), delete: vi.fn() },
    timeLog: { create: vi.fn(), delete: vi.fn() },
    label: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    issueLabel: { deleteMany: vi.fn(), createMany: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn((fn) => fn({
      issue: {
        findFirst: vi.fn().mockResolvedValue({ number: 5 }),
        create: vi.fn().mockResolvedValue({
          id: 'issue-1',
          title: 'Test Issue',
          number: 6,
          projectId: 'proj-1',
        }),
      },
      activityLog: { create: vi.fn() },
      notification: { create: vi.fn() },
      issueLabel: { deleteMany: vi.fn(), createMany: vi.fn() },
    })),
  },
}));

// Mock workflow service
vi.mock('../../src/services/workflow.service', () => ({
  validateTransition: vi.fn().mockResolvedValue(undefined),
}));

// Mock email service
vi.mock('../../src/services/email.service', () => ({
  sendIssueAssignmentEmail: vi.fn(),
}));

// Mock env
vi.mock('../../src/config/env', () => ({
  env: {
    CLIENT_URL: 'http://localhost:3050',
    NODE_ENV: 'test',
  },
}));

const { prisma } = await import('../../src/config/db');

describe('Issue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listIssues', () => {
    it('should return paginated issues when project access is valid', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        workspaceId: 'ws-1',
      });
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });
      (prisma.issue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'issue-1', title: 'Test' },
      ]);

      const result = await issueService.listIssues(
        { projectId: 'proj-1' },
        'user-1',
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('nextCursor');
    });

    it('should throw ForbiddenError for non-members', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        workspaceId: 'ws-1',
      });
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        issueService.listIssues({ projectId: 'proj-1' }, 'user-1'),
      ).rejects.toThrow('You do not have access to this project');
    });

    it('should apply search filter', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        workspaceId: 'ws-1',
      });
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });
      (prisma.issue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await issueService.listIssues(
        { projectId: 'proj-1', search: 'bug fix' },
        'user-1',
      );

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: 'bug fix' }) }),
            ]),
          }),
        }),
      );
    });

    it('should limit results to max 100', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        workspaceId: 'ws-1',
      });
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });
      (prisma.issue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await issueService.listIssues(
        { projectId: 'proj-1', limit: 999 },
        'user-1',
      );

      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 101, // 100 + 1 for hasMore check
        }),
      );
    });
  });
});
