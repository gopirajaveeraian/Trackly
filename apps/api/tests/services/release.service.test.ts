import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    release: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
    issue: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock env
vi.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

import { prisma } from '../../src/config/db';
import * as releaseService from '../../src/services/release.service';

describe('Release Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to set up project access mocks (project exists + user is a member)
  function mockProjectAccess(projectId = 'project-1', workspaceId = 'ws-1') {
    vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
      workspaceId,
    } as never);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-1',
      workspaceId,
      role: 'DEVELOPER',
    } as never);
  }

  describe('listReleases', () => {
    it('returns releases with progress data', async () => {
      mockProjectAccess();

      vi.mocked(prisma.release.findMany).mockResolvedValueOnce([
        {
          id: 'release-1',
          name: 'v1.0',
          description: 'First release',
          status: 'PLANNING',
          startDate: new Date('2025-01-01'),
          releaseDate: new Date('2025-03-01'),
          projectId: 'project-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          issues: [
            { id: 'issue-1', status: { name: 'Done' } },
            { id: 'issue-2', status: { name: 'In Progress' } },
            { id: 'issue-3', status: { name: 'Completed' } },
          ],
          _count: { issues: 3 },
        },
      ] as never);

      const result = await releaseService.listReleases('project-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].progress).toEqual({ total: 3, done: 2 });
      expect(result[0]).not.toHaveProperty('issues');
      expect(result[0].name).toBe('v1.0');
    });
  });

  describe('createRelease', () => {
    it('creates a release successfully', async () => {
      mockProjectAccess();

      const created = {
        id: 'release-new',
        name: 'v2.0',
        description: 'Second release',
        status: 'PLANNING',
        startDate: new Date('2025-04-01'),
        releaseDate: new Date('2025-06-01'),
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.release.create).mockResolvedValueOnce(created as never);

      const result = await releaseService.createRelease(
        {
          name: 'v2.0',
          description: 'Second release',
          startDate: '2025-04-01',
          releaseDate: '2025-06-01',
          projectId: 'project-1',
        },
        'user-1',
      );

      expect(result.name).toBe('v2.0');
      expect(prisma.release.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'v2.0',
          projectId: 'project-1',
        }),
      });
    });

    it('rejects if user has no project access', async () => {
      // Project exists but user is not a member
      vi.mocked(prisma.project.findUnique).mockResolvedValueOnce({
        workspaceId: 'ws-1',
      } as never);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce(null);

      await expect(
        releaseService.createRelease(
          {
            name: 'v2.0',
            projectId: 'project-1',
          },
          'user-1',
        ),
      ).rejects.toThrow('You do not have access to this project');
    });
  });

  describe('getRelease', () => {
    it('returns release with issues', async () => {
      const releaseData = {
        id: 'release-1',
        name: 'v1.0',
        description: 'First release',
        status: 'PLANNING',
        startDate: new Date('2025-01-01'),
        releaseDate: new Date('2025-03-01'),
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        issues: [
          {
            id: 'issue-1',
            title: 'Fix bug',
            status: { id: 's-1', name: 'Done', color: '#22c55e' },
            assignee: { id: 'user-1', name: 'Test', email: 'test@test.com', avatar: null },
            reporter: { id: 'user-1', name: 'Test', email: 'test@test.com', avatar: null },
            _count: { comments: 2, subTasks: 0 },
          },
        ],
        _count: { issues: 1 },
      };

      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce(releaseData as never);
      // verifyProjectAccess calls for the release's project
      mockProjectAccess('project-1');

      const result = await releaseService.getRelease('release-1', 'user-1');

      expect(result.id).toBe('release-1');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].title).toBe('Fix bug');
    });

    it('throws NotFoundError for non-existent release', async () => {
      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce(null);

      await expect(
        releaseService.getRelease('non-existent', 'user-1'),
      ).rejects.toThrow('Release not found');
    });
  });

  describe('updateRelease', () => {
    it('updates release fields', async () => {
      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce({
        projectId: 'project-1',
      } as never);
      mockProjectAccess();

      const updated = {
        id: 'release-1',
        name: 'v1.1',
        description: 'Updated',
        status: 'IN_PROGRESS',
        projectId: 'project-1',
        startDate: new Date(),
        releaseDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.release.update).mockResolvedValueOnce(updated as never);

      const result = await releaseService.updateRelease('release-1', 'user-1', {
        name: 'v1.1',
        status: 'IN_PROGRESS' as never,
      });

      expect(result.name).toBe('v1.1');
      expect(prisma.release.update).toHaveBeenCalledWith({
        where: { id: 'release-1' },
        data: expect.objectContaining({ name: 'v1.1' }),
      });
    });
  });

  describe('deleteRelease', () => {
    it('deletes a release', async () => {
      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce({
        projectId: 'project-1',
      } as never);
      mockProjectAccess();

      vi.mocked(prisma.release.delete).mockResolvedValueOnce({} as never);

      await releaseService.deleteRelease('release-1', 'user-1');

      expect(prisma.release.delete).toHaveBeenCalledWith({
        where: { id: 'release-1' },
      });
    });
  });

  describe('addIssueToRelease', () => {
    it('links an issue to a release', async () => {
      vi.mocked(prisma.release.findUnique).mockResolvedValueOnce({
        projectId: 'project-1',
      } as never);
      mockProjectAccess();

      vi.mocked(prisma.issue.findUnique).mockResolvedValueOnce({
        projectId: 'project-1',
      } as never);

      vi.mocked(prisma.issue.update).mockResolvedValueOnce({
        id: 'issue-1',
        releaseId: 'release-1',
      } as never);

      const result = await releaseService.addIssueToRelease('release-1', 'issue-1', 'user-1');

      expect(result.releaseId).toBe('release-1');
      expect(prisma.issue.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { releaseId: 'release-1' },
      });
    });
  });

  describe('removeIssueFromRelease', () => {
    it('removes issue from release', async () => {
      vi.mocked(prisma.issue.findUnique).mockResolvedValueOnce({
        projectId: 'project-1',
      } as never);
      mockProjectAccess();

      vi.mocked(prisma.issue.update).mockResolvedValueOnce({
        id: 'issue-1',
        releaseId: null,
      } as never);

      const result = await releaseService.removeIssueFromRelease('issue-1', 'user-1');

      expect(result.releaseId).toBeNull();
      expect(prisma.issue.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { releaseId: null },
      });
    });
  });
});
