import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    capacity: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    sprint: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
    issue: {
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
import * as capacityService from '../../src/services/capacity.service';

describe('Capacity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to set up sprint access mocks
  function mockSprintAccess(
    sprintId = 'sprint-1',
    projectId = 'project-1',
    workspaceId = 'ws-1',
  ) {
    vi.mocked(prisma.sprint.findUnique).mockResolvedValueOnce({
      id: sprintId,
      projectId,
      project: { workspaceId },
    } as never);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-1',
      workspaceId,
      role: 'DEVELOPER',
    } as never);
  }

  describe('listCapacities', () => {
    it('returns capacities with computed allocated hours', async () => {
      mockSprintAccess();

      vi.mocked(prisma.capacity.findMany).mockResolvedValueOnce([
        {
          id: 'cap-1',
          userId: 'user-1',
          sprintId: 'sprint-1',
          availableHours: 40,
          allocatedHours: 0,
          user: { id: 'user-1', name: 'Alice', avatar: null },
        },
        {
          id: 'cap-2',
          userId: 'user-2',
          sprintId: 'sprint-1',
          availableHours: 30,
          allocatedHours: 0,
          user: { id: 'user-2', name: 'Bob', avatar: null },
        },
      ] as never);

      // Issues assigned in this sprint with estimates
      vi.mocked(prisma.issue.findMany).mockResolvedValueOnce([
        { assigneeId: 'user-1', estimate: 8 },
        { assigneeId: 'user-1', estimate: 12 },
        { assigneeId: 'user-2', estimate: 5 },
      ] as never);

      const result = await capacityService.listCapacities('sprint-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].allocatedHours).toBe(20); // 8 + 12
      expect(result[1].allocatedHours).toBe(5);
      expect(result[0].user.name).toBe('Alice');
    });
  });

  describe('upsertCapacity', () => {
    it('creates new capacity', async () => {
      mockSprintAccess();

      const upserted = {
        id: 'cap-new',
        userId: 'user-2',
        sprintId: 'sprint-1',
        availableHours: 35,
        allocatedHours: 0,
        user: { id: 'user-2', name: 'Bob', avatar: null },
      };

      vi.mocked(prisma.capacity.upsert).mockResolvedValueOnce(upserted as never);

      const result = await capacityService.upsertCapacity(
        'sprint-1',
        'user-1',
        'user-2',
        35,
      );

      expect(result.availableHours).toBe(35);
      expect(result.userId).toBe('user-2');
      expect(prisma.capacity.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_sprintId: { userId: 'user-2', sprintId: 'sprint-1' },
          },
          create: expect.objectContaining({
            userId: 'user-2',
            sprintId: 'sprint-1',
            availableHours: 35,
          }),
          update: { availableHours: 35 },
        }),
      );
    });

    it('updates existing capacity', async () => {
      mockSprintAccess();

      const upserted = {
        id: 'cap-1',
        userId: 'user-1',
        sprintId: 'sprint-1',
        availableHours: 20,
        allocatedHours: 0,
        user: { id: 'user-1', name: 'Alice', avatar: null },
      };

      vi.mocked(prisma.capacity.upsert).mockResolvedValueOnce(upserted as never);

      const result = await capacityService.upsertCapacity(
        'sprint-1',
        'user-1',
        'user-1',
        20,
      );

      expect(result.availableHours).toBe(20);
      expect(prisma.capacity.upsert).toHaveBeenCalled();
    });
  });
});
