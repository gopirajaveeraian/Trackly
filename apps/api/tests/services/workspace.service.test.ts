import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceService from '../../src/services/workspace.service';

vi.mock('../../src/config/db', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: Function) => fn({
      workspace: {
        create: vi.fn().mockResolvedValue({
          id: 'ws-1',
          name: 'Test Workspace',
          slug: 'test-workspace',
        }),
      },
      workspaceMember: {
        create: vi.fn(),
      },
    })),
  },
}));

const { prisma } = await import('../../src/config/db');

describe('Workspace Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUserWorkspaces', () => {
    it('should return workspaces with role and counts', async () => {
      const mockMemberships = [
        {
          role: 'ADMIN',
          workspace: {
            id: 'ws-1',
            name: 'Workspace 1',
            slug: 'workspace-1',
            _count: { members: 3, projects: 2 },
          },
        },
      ];
      (prisma.workspaceMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockMemberships);

      const result = await workspaceService.listUserWorkspaces('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('role', 'ADMIN');
      expect(result[0]).toHaveProperty('memberCount', 3);
      expect(result[0]).toHaveProperty('projectCount', 2);
    });

    it('should return empty array if user has no workspaces', async () => {
      (prisma.workspaceMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await workspaceService.listUserWorkspaces('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('createWorkspace', () => {
    it('should throw ConflictError if slug is taken', async () => {
      (prisma.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ws-existing',
        slug: 'taken-slug',
      });

      await expect(
        workspaceService.createWorkspace({
          name: 'New Workspace',
          slug: 'taken-slug',
          userId: 'user-1',
        }),
      ).rejects.toThrow('A workspace with this slug already exists');
    });

    it('should create workspace and add creator as ADMIN', async () => {
      (prisma.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await workspaceService.createWorkspace({
        name: 'Test Workspace',
        slug: 'test-workspace',
        userId: 'user-1',
      });

      expect(result).toHaveProperty('id', 'ws-1');
      expect(result).toHaveProperty('name', 'Test Workspace');
    });
  });

  describe('getWorkspace', () => {
    it('should throw NotFoundError for non-existent workspace', async () => {
      (prisma.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        workspaceService.getWorkspace('ws-nonexistent', 'user-1'),
      ).rejects.toThrow('Workspace not found');
    });

    it('should throw ForbiddenError for non-members', async () => {
      (prisma.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ws-1',
        name: 'Workspace 1',
        members: [{ userId: 'other-user' }],
        _count: { projects: 1 },
      });

      await expect(
        workspaceService.getWorkspace('ws-1', 'user-1'),
      ).rejects.toThrow('You are not a member of this workspace');
    });

    it('should return workspace for valid member', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        name: 'Workspace 1',
        members: [{ userId: 'user-1', role: 'ADMIN' }],
        _count: { projects: 2 },
      };
      (prisma.workspace.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockWorkspace);

      const result = await workspaceService.getWorkspace('ws-1', 'user-1');
      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('updateWorkspace', () => {
    it('should throw NotFoundError if user is not a member', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        workspaceService.updateWorkspace('ws-1', 'user-1', { name: 'Updated' }),
      ).rejects.toThrow('Workspace not found');
    });

    it('should throw ForbiddenError for non-admin members', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });

      await expect(
        workspaceService.updateWorkspace('ws-1', 'user-1', { name: 'Updated' }),
      ).rejects.toThrow('Only admins can update workspace settings');
    });

    it('should update workspace for admin member', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'ADMIN',
      });
      (prisma.workspace.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ws-1',
        name: 'Updated Name',
      });

      const result = await workspaceService.updateWorkspace('ws-1', 'user-1', {
        name: 'Updated Name',
      });

      expect(result).toHaveProperty('name', 'Updated Name');
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: { name: 'Updated Name' },
      });
    });
  });

  describe('inviteMember', () => {
    it('should throw ForbiddenError if inviter is not a member', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        workspaceService.inviteMember({
          email: 'invite@test.com',
          role: 'DEVELOPER' as never,
          workspaceId: 'ws-1',
          inviterId: 'user-1',
        }),
      ).rejects.toThrow('You are not a member of this workspace');
    });

    it('should throw ForbiddenError if inviter is not ADMIN or PM', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });

      await expect(
        workspaceService.inviteMember({
          email: 'invite@test.com',
          role: 'DEVELOPER' as never,
          workspaceId: 'ws-1',
          inviterId: 'user-1',
        }),
      ).rejects.toThrow('Only admins and project managers can invite members');
    });
  });

  describe('listMembers', () => {
    it('should throw ForbiddenError for non-members', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        workspaceService.listMembers('ws-1', 'user-1'),
      ).rejects.toThrow('You are not a member of this workspace');
    });

    it('should return members for valid workspace member', async () => {
      (prisma.workspaceMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'DEVELOPER',
      });
      const mockMembers = [
        { userId: 'user-1', role: 'ADMIN', user: { id: 'user-1', name: 'User 1' } },
      ];
      (prisma.workspaceMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockMembers);

      const result = await workspaceService.listMembers('ws-1', 'user-1');
      expect(result).toEqual(mockMembers);
    });
  });
});
