import { prisma } from '../config/db';
import { IntegrationType } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateIntegrationInput {
  type: IntegrationType;
  name: string;
  config: Record<string, string>;
  workspaceId: string;
}

interface UpdateIntegrationInput {
  name?: string;
  config?: Record<string, string>;
  enabled?: boolean;
}

/**
 * Verifies workspace membership for a user.
 */
async function verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You do not have access to this workspace');
  }
}

/**
 * Verifies workspace membership via an integration ID.
 */
async function verifyIntegrationAccess(integrationId: string, userId: string): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { workspaceId: true },
  });

  if (!integration) {
    throw new NotFoundError('Integration');
  }

  await verifyWorkspaceAccess(integration.workspaceId, userId);

  return integration.workspaceId;
}

/**
 * Lists all integrations for a workspace.
 *
 * @param workspaceId - The workspace to list integrations from
 * @param userId - The requesting user's ID
 * @returns Array of integrations
 */
export async function listIntegrations(workspaceId: string, userId: string) {
  await verifyWorkspaceAccess(workspaceId, userId);

  return prisma.integration.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new integration for a workspace.
 *
 * @param input - Integration creation data
 * @param userId - The requesting user's ID
 * @returns The created integration
 */
export async function createIntegration(input: CreateIntegrationInput, userId: string) {
  const { type, name, config, workspaceId } = input;

  await verifyWorkspaceAccess(workspaceId, userId);

  return prisma.integration.create({
    data: {
      type,
      name,
      config,
      workspaceId,
    },
  });
}

/**
 * Updates an integration's properties (name, config, enabled).
 *
 * @param integrationId - The integration ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns The updated integration
 */
export async function updateIntegration(
  integrationId: string,
  userId: string,
  data: UpdateIntegrationInput,
) {
  await verifyIntegrationAccess(integrationId, userId);

  return prisma.integration.update({
    where: { id: integrationId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.config !== undefined && { config: data.config }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
}

/**
 * Deletes an integration.
 *
 * @param integrationId - The integration ID to delete
 * @param userId - The requesting user's ID
 */
export async function deleteIntegration(integrationId: string, userId: string) {
  await verifyIntegrationAccess(integrationId, userId);

  return prisma.integration.delete({
    where: { id: integrationId },
  });
}

/**
 * Tests the connection for an integration.
 * Performs a real API call to verify credentials are valid.
 *
 * @param integrationId - The integration ID to test
 * @param userId - The requesting user's ID
 * @returns Connection test result
 */
export async function testConnection(integrationId: string, userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    throw new NotFoundError('Integration');
  }

  await verifyWorkspaceAccess(integration.workspaceId, userId);

  const config = integration.config as Record<string, string>;

  switch (integration.type) {
    case 'GITHUB': {
      const token = config.personalAccessToken;
      if (!token) return { success: false, message: 'No personal access token configured' };
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Trackly' },
        });
        if (response.ok) {
          const data = await response.json() as { login: string };
          return { success: true, message: `Connected as ${data.login}` };
        }
        return { success: false, message: `GitHub API returned ${response.status}` };
      } catch (err) {
        return { success: false, message: 'Failed to connect to GitHub API' };
      }
    }
    case 'SLACK': {
      const webhookUrl = config.webhookUrl;
      if (!webhookUrl) return { success: false, message: 'No webhook URL configured' };
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Trackly integration test - connection successful!' }),
        });
        if (response.ok) {
          return { success: true, message: 'Test message sent to Slack' };
        }
        return { success: false, message: `Slack webhook returned ${response.status}` };
      } catch (err) {
        return { success: false, message: 'Failed to connect to Slack webhook' };
      }
    }
    case 'JIRA': {
      const baseUrl = config.baseUrl;
      const email = config.email;
      const apiToken = config.apiToken;
      if (!baseUrl || !email || !apiToken) {
        return { success: false, message: 'Missing Jira credentials' };
      }
      try {
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json() as { displayName: string };
          return { success: true, message: `Connected as ${data.displayName}` };
        }
        return { success: false, message: `Jira API returned ${response.status}` };
      } catch (err) {
        return { success: false, message: 'Failed to connect to Jira API' };
      }
    }
    default:
      return { success: true, message: 'Connection successful' };
  }
}
