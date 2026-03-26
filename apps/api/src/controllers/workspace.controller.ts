import { Request, Response, NextFunction } from 'express';
import * as workspaceService from '../services/workspace.service';

/**
 * GET /api/workspaces
 * Lists all workspaces the authenticated user belongs to.
 */
export async function listWorkspaces(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaces = await workspaceService.listUserWorkspaces(req.user!.userId);

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/workspaces
 * Creates a new workspace.
 */
export async function createWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspace = await workspaceService.createWorkspace({
      ...req.body,
      userId: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      data: workspace,
      message: 'Workspace created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/workspaces/:id
 * Gets workspace details.
 */
export async function getWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspace = await workspaceService.getWorkspace(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/workspaces/:id
 * Updates workspace settings.
 */
export async function updateWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspace = await workspaceService.updateWorkspace(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: workspace,
      message: 'Workspace updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/workspaces/:id/invite
 * Invites a user to the workspace.
 */
export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const membership = await workspaceService.inviteMember({
      ...req.body,
      workspaceId: req.params.id,
      inviterId: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      data: membership,
      message: 'Member invited',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/workspaces/:id/members
 * Lists all members of a workspace.
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const members = await workspaceService.listMembers(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}
