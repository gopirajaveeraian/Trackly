import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as projectService from '../../src/services/project.service';

vi.mock('../../src/config/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspaceMember: { findUnique: vi.fn() },
    status: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock workflow service
vi.mock('../../src/services/workflow.service', () => ({
  createDefaultTransitions: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import('../../src/config/db');

describe('Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should list projects for workspace members', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', key: 'P1', type: 'SCRUM' },
      ];
      (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

      const result = await projectService.listProjects('ws-1', 'user-1');
      expect(result).toEqual(mockProjects);
    });

    it('should throw ForbiddenError for non-members', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        projectService.listProjects('ws-1', 'user-1'),
      ).rejects.toThrow('You are not a member of this workspace');
    });
  });

  describe('getProject', () => {
    it('should throw NotFoundError for non-existent project', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        projectService.getProject('proj-1', 'user-1'),
      ).rejects.toThrow('Project not found');
    });

    it('should return project with statuses for valid member', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project 1',
        key: 'P1',
        type: 'SCRUM',
        workspaceId: 'ws-1',
        statuses: [{ id: 's-1', name: 'To Do', order: 0 }],
        _count: { issues: 3, sprints: 1 },
      };
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });

      const result = await projectService.getProject('proj-1', 'user-1');
      expect(result).toEqual(mockProject);
    });
  });

  describe('deleteProject', () => {
    it('should throw NotFoundError for non-existent project', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        projectService.deleteProject('proj-1', 'user-1'),
      ).rejects.toThrow('Project not found');
    });

    it('should delete project for valid member', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        workspaceId: 'ws-1',
      });
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'ADMIN',
      });
      (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await projectService.deleteProject('proj-1', 'user-1');
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });
  });
});
