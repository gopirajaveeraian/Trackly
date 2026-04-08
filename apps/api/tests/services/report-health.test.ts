import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    sprint: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
    },
    sprintSnapshot: {
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
import * as reportService from '../../src/services/report.service';

describe('Report Service - Sprint Health & Burn-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockProjectAccess(workspaceId = 'ws-1') {
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

  describe('getSprintHealth', () => {
    it('returns health data with score', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      vi.mocked(prisma.sprint.findUnique).mockResolvedValueOnce({
        id: 'sprint-1',
        name: 'Sprint 1',
        startDate,
        endDate,
        status: 'ACTIVE',
        projectId: 'project-1',
        goal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      mockProjectAccess();

      // Sprint issues
      vi.mocked(prisma.issue.findMany).mockResolvedValueOnce([
        {
          id: 'issue-1',
          storyPoints: 5,
          createdAt: new Date(startDate.getTime() - 1000), // before sprint start
          status: { name: 'Done' },
        },
        {
          id: 'issue-2',
          storyPoints: 3,
          createdAt: new Date(startDate.getTime() - 1000),
          status: { name: 'In Progress' },
        },
        {
          id: 'issue-3',
          storyPoints: 8,
          createdAt: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), // added after start
          status: { name: 'To Do' },
        },
      ] as never);

      // Sprint snapshots for burn-up
      vi.mocked(prisma.sprintSnapshot.findMany).mockResolvedValueOnce([
        {
          id: 'snap-1',
          sprintId: 'sprint-1',
          totalPoints: 8,
          completedPoints: 0,
          totalIssues: 2,
          completedIssues: 0,
          scopeChanges: 0,
          snapshotDate: startDate,
        },
        {
          id: 'snap-2',
          sprintId: 'sprint-1',
          totalPoints: 16,
          completedPoints: 5,
          totalIssues: 3,
          completedIssues: 1,
          scopeChanges: 1,
          snapshotDate: now,
        },
      ] as never);

      const result = await reportService.getSprintHealth('sprint-1', 'user-1');

      expect(result.sprint.id).toBe('sprint-1');
      expect(result.sprint.name).toBe('Sprint 1');
      expect(result.totalPoints).toBe(16); // 5 + 3 + 8
      expect(result.completedPoints).toBe(5);
      expect(result.totalIssues).toBe(3);
      expect(result.completedIssues).toBe(1);
      expect(result.scopeChanges).toBe(1); // 1 issue added after sprint start
      expect(typeof result.healthScore).toBe('number');
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(typeof result.timeElapsedPercent).toBe('number');
      expect(typeof result.progressPercent).toBe('number');
      expect(result.burnupData).toHaveLength(2);
      expect(result.burnupData[0].total).toBe(8);
      expect(result.burnupData[1].completed).toBe(5);
    });

    it('throws NotFoundError for non-existent sprint', async () => {
      vi.mocked(prisma.sprint.findUnique).mockResolvedValueOnce(null);

      await expect(
        reportService.getSprintHealth('non-existent', 'user-1'),
      ).rejects.toThrow('Sprint not found');
    });
  });

  describe('getBurnup', () => {
    it('returns burn-up chart data', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-03');

      vi.mocked(prisma.sprint.findUnique).mockResolvedValueOnce({
        id: 'sprint-1',
        name: 'Sprint 1',
        startDate,
        endDate,
        status: 'COMPLETED',
        projectId: 'project-1',
        goal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      mockProjectAccess();

      // Issues in the sprint
      vi.mocked(prisma.issue.findMany).mockResolvedValueOnce([
        {
          id: 'issue-1',
          storyPoints: 5,
          createdAt: new Date('2024-12-30'),
          status: { id: 's-1', name: 'Done' },
        },
        {
          id: 'issue-2',
          storyPoints: 3,
          createdAt: new Date('2025-01-02'),
          status: { id: 's-2', name: 'To Do' },
        },
      ] as never);

      // Activity logs: issue-1 moved to Done on Jan 2
      vi.mocked(prisma.activityLog.findMany).mockResolvedValueOnce([
        {
          id: 'act-1',
          issueId: 'issue-1',
          field: 'status',
          oldValue: 'In Progress',
          newValue: 'Done',
          createdAt: new Date('2025-01-02T10:00:00Z'),
          action: 'update',
          userId: 'user-1',
        },
      ] as never);

      const result = await reportService.getBurnup('sprint-1', 'user-1');

      expect(result.sprint.id).toBe('sprint-1');
      expect(result.totalPoints).toBe(8);
      expect(result.data.length).toBeGreaterThanOrEqual(3);
      // Verify data has expected structure
      for (const entry of result.data) {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('total');
        expect(entry).toHaveProperty('completed');
        expect(typeof entry.total).toBe('number');
        expect(typeof entry.completed).toBe('number');
      }
      // The last entry should reflect total scope = 8 (both issues)
      const lastEntry = result.data[result.data.length - 1];
      expect(lastEntry.total).toBe(8);
      // Issue-1 should be completed by the last day
      expect(lastEntry.completed).toBe(5);
    });

    it('returns empty data if sprint has no start date', async () => {
      vi.mocked(prisma.sprint.findUnique).mockResolvedValueOnce({
        id: 'sprint-1',
        name: 'Sprint 1',
        startDate: null,
        endDate: null,
        status: 'PLANNED',
        projectId: 'project-1',
        goal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      mockProjectAccess();

      const result = await reportService.getBurnup('sprint-1', 'user-1');

      expect(result.data).toEqual([]);
      expect(result.totalPoints).toBe(0);
    });
  });
});
