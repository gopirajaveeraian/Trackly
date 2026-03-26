import { Request, Response, NextFunction } from 'express';
import * as sprintService from '../services/sprint.service';

/**
 * GET /api/sprints?projectId=
 * Lists all sprints for a project.
 */
export async function listSprints(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const sprints = await sprintService.listSprints(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data: sprints,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sprints
 * Creates a new sprint.
 */
export async function createSprint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprint = await sprintService.createSprint(req.body, req.user!.userId);

    res.status(201).json({
      success: true,
      data: sprint,
      message: 'Sprint created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sprints/:id
 * Gets sprint details with issues.
 */
export async function getSprint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprint = await sprintService.getSprint(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/sprints/:id
 * Updates a sprint.
 */
export async function updateSprint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprint = await sprintService.updateSprint(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: sprint,
      message: 'Sprint updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sprints/:id/start
 * Starts a sprint.
 */
export async function startSprint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprint = await sprintService.startSprint(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: sprint,
      message: 'Sprint started',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sprints/:id/complete
 * Completes a sprint, moving incomplete issues to backlog.
 */
export async function completeSprint(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await sprintService.completeSprint(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: result,
      message: `Sprint completed. ${result.movedToBacklog} issue(s) moved to backlog.`,
    });
  } catch (error) {
    next(error);
  }
}
