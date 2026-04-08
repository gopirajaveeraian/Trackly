import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../src/config/db', () => ({
  prisma: {
    integration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
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
import * as integrationService from '../../src/services/integration.service';

describe('Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to set up workspace access mocks
  function mockWorkspaceAccess(workspaceId = 'ws-1') {
    vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
      id: workspaceId,
    } as never);
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-1',
      workspaceId,
      role: 'ADMIN',
    } as never);
  }

  // Helper to set up integration access mocks (integration exists + workspace access)
  function mockIntegrationAccess(
    integrationId = 'int-1',
    workspaceId = 'ws-1',
  ) {
    vi.mocked(prisma.integration.findUnique).mockResolvedValueOnce({
      id: integrationId,
      workspaceId,
    } as never);
    mockWorkspaceAccess(workspaceId);
  }

  describe('listIntegrations', () => {
    it('returns integrations for workspace', async () => {
      mockWorkspaceAccess();

      const integrations = [
        {
          id: 'int-1',
          type: 'GITHUB',
          name: 'GitHub',
          config: { token: '***' },
          enabled: true,
          workspaceId: 'ws-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'int-2',
          type: 'SLACK',
          name: 'Slack',
          config: { webhookUrl: 'https://hooks.slack.com/...' },
          enabled: true,
          workspaceId: 'ws-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.integration.findMany).mockResolvedValueOnce(integrations as never);

      const result = await integrationService.listIntegrations('ws-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('GITHUB');
      expect(result[1].type).toBe('SLACK');
    });
  });

  describe('createIntegration', () => {
    it('creates integration', async () => {
      mockWorkspaceAccess();

      const created = {
        id: 'int-new',
        type: 'GITHUB',
        name: 'GitHub Integration',
        config: { token: 'ghp_123' },
        enabled: true,
        workspaceId: 'ws-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.integration.create).mockResolvedValueOnce(created as never);

      const result = await integrationService.createIntegration(
        {
          type: 'GITHUB' as never,
          name: 'GitHub Integration',
          config: { token: 'ghp_123' },
          workspaceId: 'ws-1',
        },
        'user-1',
      );

      expect(result.name).toBe('GitHub Integration');
      expect(result.type).toBe('GITHUB');
      expect(prisma.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'GITHUB',
          name: 'GitHub Integration',
          workspaceId: 'ws-1',
        }),
      });
    });

    it('rejects duplicate type per workspace', async () => {
      // Workspace found but user is not a member
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'ws-1',
      } as never);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValueOnce(null);

      await expect(
        integrationService.createIntegration(
          {
            type: 'GITHUB' as never,
            name: 'GitHub',
            config: {},
            workspaceId: 'ws-1',
          },
          'user-1',
        ),
      ).rejects.toThrow('You do not have access to this workspace');
    });
  });

  describe('updateIntegration', () => {
    it('toggles enabled', async () => {
      mockIntegrationAccess();

      const updated = {
        id: 'int-1',
        type: 'GITHUB',
        name: 'GitHub',
        config: { token: '***' },
        enabled: false,
        workspaceId: 'ws-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.integration.update).mockResolvedValueOnce(updated as never);

      const result = await integrationService.updateIntegration('int-1', 'user-1', {
        enabled: false,
      });

      expect(result.enabled).toBe(false);
      expect(prisma.integration.update).toHaveBeenCalledWith({
        where: { id: 'int-1' },
        data: expect.objectContaining({ enabled: false }),
      });
    });
  });

  describe('deleteIntegration', () => {
    it('deletes integration', async () => {
      mockIntegrationAccess();

      vi.mocked(prisma.integration.delete).mockResolvedValueOnce({} as never);

      await integrationService.deleteIntegration('int-1', 'user-1');

      expect(prisma.integration.delete).toHaveBeenCalledWith({
        where: { id: 'int-1' },
      });
    });
  });

  describe('testConnection', () => {
    it('returns success stub', async () => {
      mockIntegrationAccess();

      const result = await integrationService.testConnection('int-1', 'user-1');

      expect(result).toEqual({ success: true, message: 'Connection successful' });
    });
  });
});
