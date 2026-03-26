import { prisma } from '../config/db';

interface SearchResult {
  issues: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    number: number;
    project: { id: string; name: string; key: string };
    status: { name: string; color: string };
    assignee: { id: string; name: string; avatar: string | null } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    key: string;
    type: string;
    description: string | null;
  }>;
}

/**
 * Performs a global search across issues and projects.
 * Uses case-insensitive matching on titles, keys, and descriptions.
 */
export async function globalSearch(
  query: string,
  workspaceId: string,
  userId: string,
  limit: number = 20,
): Promise<SearchResult> {
  const searchTerm = query.trim();
  if (!searchTerm) {
    return { issues: [], projects: [] };
  }

  const [issues, projects] = await Promise.all([
    prisma.issue.findMany({
      where: {
        project: {
          workspaceId,
          workspace: {
            members: { some: { userId } },
          },
        },
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        number: true,
        project: { select: { id: true, name: true, key: true } },
        status: { select: { name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.project.findMany({
      where: {
        workspaceId,
        workspace: {
          members: { some: { userId } },
        },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { key: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        key: true,
        type: true,
        description: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { issues, projects };
}
