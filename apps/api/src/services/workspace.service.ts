import { prisma } from '../config/db';
import { Role } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateWorkspaceInput {
  name: string;
  slug: string;
  userId: string;
}

interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
}

interface InviteMemberInput {
  email: string;
  role: Role;
  workspaceId: string;
  inviterId: string;
}

/**
 * Retrieves all workspaces that a user is a member of.
 *
 * @param userId - The ID of the user whose workspaces to list
 * @returns Array of workspaces with member count
 */
export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: { members: true, projects: true },
          },
        },
      },
    },
    orderBy: {
      workspace: { createdAt: 'desc' },
    },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    memberCount: m.workspace._count.members,
    projectCount: m.workspace._count.projects,
  }));
}

/**
 * Creates a new workspace and adds the creator as ADMIN.
 *
 * @param input - Workspace creation data including the creator's userId
 * @returns The newly created workspace
 * @throws ConflictError if slug is already taken
 */
export async function createWorkspace(input: CreateWorkspaceInput) {
  const { name, slug, userId } = input;

  const existing = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new ConflictError('A workspace with this slug already exists');
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name, slug },
    });

    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId: ws.id,
        role: 'ADMIN',
      },
    });

    return ws;
  });

  return workspace;
}

/**
 * Retrieves workspace details with member list.
 * Verifies the requesting user is a member.
 *
 * @param workspaceId - The workspace ID to fetch
 * @param userId - The requesting user's ID
 * @returns Workspace with members and project count
 * @throws NotFoundError if workspace doesn't exist
 * @throws ForbiddenError if user is not a member
 */
export async function getWorkspace(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
      _count: {
        select: { projects: true },
      },
    },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace');
  }

  const isMember = workspace.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  return workspace;
}

/**
 * Updates workspace properties (name, slug).
 * Only ADMIN members can update workspace settings.
 *
 * @param workspaceId - The workspace ID to update
 * @param userId - The requesting user's ID
 * @param data - Fields to update
 * @returns Updated workspace
 * @throws NotFoundError if workspace doesn't exist
 * @throws ForbiddenError if user is not an ADMIN
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceInput,
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });

  if (!membership) {
    throw new NotFoundError('Workspace');
  }

  if (membership.role !== 'ADMIN') {
    throw new ForbiddenError('Only admins can update workspace settings');
  }

  if (data.slug) {
    const existing = await prisma.workspace.findFirst({
      where: { slug: data.slug, id: { not: workspaceId } },
    });
    if (existing) {
      throw new ConflictError('A workspace with this slug already exists');
    }
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
}

/**
 * Invites a user to a workspace by email.
 * Creates a WorkspaceMember record for the invited user.
 *
 * @param input - Invitation data including email, role, and workspaceId
 * @returns The created workspace membership
 * @throws NotFoundError if the invited user doesn't have an account
 * @throws ConflictError if the user is already a member
 * @throws ForbiddenError if the inviter lacks permission
 */
export async function inviteMember(input: InviteMemberInput) {
  const { email, role, workspaceId, inviterId } = input;

  // Verify inviter is ADMIN or PROJECT_MANAGER
  const inviterMembership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: inviterId, workspaceId },
    },
  });

  if (!inviterMembership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  if (!['ADMIN', 'PROJECT_MANAGER'].includes(inviterMembership.role)) {
    throw new ForbiddenError('Only admins and project managers can invite members');
  }

  // Find the user to invite
  const userToInvite = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!userToInvite) {
    throw new NotFoundError('User with this email');
  }

  // Check if already a member
  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: userToInvite.id,
        workspaceId,
      },
    },
  });

  if (existingMembership) {
    throw new ConflictError('This user is already a member of the workspace');
  }

  const membership = await prisma.workspaceMember.create({
    data: {
      userId: userToInvite.id,
      workspaceId,
      role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  return membership;
}

/**
 * Lists all members of a workspace.
 *
 * @param workspaceId - The workspace ID
 * @param userId - The requesting user's ID (must be a member)
 * @returns Array of workspace members with user details
 * @throws ForbiddenError if user is not a member
 */
export async function listMembers(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });

  if (!membership) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });
}
