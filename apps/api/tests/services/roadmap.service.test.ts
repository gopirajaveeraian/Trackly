import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
    release: {
      findMany: vi.fn(),
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
import * as roadmapService from '../../src/services/roadmap.service';

describe('Roadmap Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('getRoadmap', () => {
    it('returns epics and releases with progress', async () => {
      mockProjectAccess();

      // Mock epics (issues of type EPIC)
      vi.mocked(prisma.issue.findMany).mockResolvedValueOnce([
        {
          id: 'epic-1',
          title: 'User Authentication',
          type: 'EPIC',
          projectId: 'project-1',
          createdAt: new Date('2025-01-01'),
          subTasks: [
            { id: 'i-1', dueDate: new Date('2025-02-01'), status: { name: 'Done' } },
            { id: 'i-2', dueDate: new Date('2025-03-15'), status: { name: 'In Progress' } },
            { id: 'i-3', dueDate: new Date('2025-01-15'), status: { name: 'Completed' } },
          ],
        },
      ] as never);

      // Mock releases
      vi.mocked(prisma.release.findMany).mockResolvedValueOnce([
        {
          id: 'release-1',
          name: 'v1.0',
          startDate: new Date('2025-01-01'),
          releaseDate: new Date('2025-04-01'),
          issues: [
            { id: 'i-1', status: { name: 'Done' } },
            { id: 'i-2', status: { name: 'To Do' } },
          ],
        },
      ] as never);

      const result = await roadmapService.getRoadmap('project-1', 'user-1');

      // Verify epics
      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].name).toBe('User Authentication');
      expect(result.epics[0].progress).toEqual({ total: 3, done: 2 });
      expect(result.epics[0].issueCount).toBe(3);
      expect(result.epics[0].startDate).toBeDefined();
      expect(result.epics[0].endDate).toBeDefined();
      expect(result.epics[0].color).toBeDefined();

      // Verify releases
      expect(result.releases).toHaveLength(1);
      expect(result.releases[0].name).toBe('v1.0');
      expect(result.releases[0].progress).toEqual({ total: 2, done: 1 });
      expect(result.releases[0].issueCount).toBe(2);
    });

    it('handles empty project', async () => {
      mockProjectAccess();

      vi.mocked(prisma.issue.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.release.findMany).mockResolvedValueOnce([]);

      const result = await roadmapService.getRoadmap('project-1', 'user-1');

      expect(result.epics).toHaveLength(0);
      expect(result.releases).toHaveLength(0);
    });
  });
});
