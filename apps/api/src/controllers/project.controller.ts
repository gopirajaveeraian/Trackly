import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';

/**
 * GET /api/projects?workspaceId=
 * Lists all projects in a workspace.
 */
export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = req.query.workspaceId as string;
    const projects = await projectService.listProjects(workspaceId, req.user!.userId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects
 * Creates a new project with default statuses.
 */
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.createProject(req.body, req.user!.userId);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id
 * Gets project details with statuses.
 */
export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.getProject(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/projects/:id
 * Updates a project.
 */
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectService.updateProject(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:id
 * Deletes a project.
 */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await projectService.deleteProject(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Project deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id/statuses
 * Gets all statuses for a project.
 */
export async function getStatuses(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const statuses = await projectService.getStatuses(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/:id/statuses
 * Creates a custom status for a project.
 */
export async function createStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = await projectService.createStatus(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(201).json({
      success: true,
      data: status,
      message: 'Status created',
    });
  } catch (error) {
    next(error);
  }
}
