import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sprintService from '../../src/services/sprint.service';

vi.mock('../../src/config/db', () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
    sprint: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { prisma } = await import('../../src/config/db');

function mockProjectAccess() {
  (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    workspaceId: 'ws-1',
  });
  (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    userId: 'user-1',
    workspaceId: 'ws-1',
    role: 'DEVELOPER',
  });
}

describe('Sprint Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSprints', () => {
    it('should return sprints for a project', async () => {
      mockProjectAccess();
      const mockSprints = [
        { id: 'sprint-1', name: 'Sprint 1', _count: { issues: 5 } },
      ];
      (prisma.sprint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSprints);

      const result = await sprintService.listSprints('proj-1', 'user-1');
      expect(result).toEqual(mockSprints);
    });
  });

  describe('startSprint', () => {
    it('should reject starting a non-PLANNED sprint', async () => {
      (prisma.sprint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
        projectId: 'proj-1',
      });
      mockProjectAccess();

      await expect(
        sprintService.startSprint('sprint-1', 'user-1'),
      ).rejects.toThrow('Only planned sprints can be started');
    });

    it('should reject if another sprint is already active', async () => {
      (prisma.sprint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-2',
        status: 'PLANNED',
        projectId: 'proj-1',
      });
      mockProjectAccess();
      (prisma.sprint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-1',
        name: 'Active Sprint',
        status: 'ACTIVE',
      });

      await expect(
        sprintService.startSprint('sprint-2', 'user-1'),
      ).rejects.toThrow('already active');
    });

    it('should start a planned sprint with default dates if not set', async () => {
      (prisma.sprint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-1',
        status: 'PLANNED',
        projectId: 'proj-1',
        startDate: null,
        endDate: null,
      });
      mockProjectAccess();
      (prisma.sprint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.sprint.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-1',
        status: 'ACTIVE',
      });

      const result = await sprintService.startSprint('sprint-1', 'user-1');
      expect(result).toEqual({ id: 'sprint-1', status: 'ACTIVE' });
      expect(prisma.sprint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  describe('completeSprint', () => {
    it('should reject completing a non-ACTIVE sprint', async () => {
      (prisma.sprint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sprint-1',
        status: 'PLANNED',
        projectId: 'proj-1',
        project: { statuses: [] },
      });
      mockProjectAccess();

      await expect(
        sprintService.completeSprint('sprint-1', 'user-1'),
      ).rejects.toThrow('Only active sprints can be completed');
    });
  });
});
