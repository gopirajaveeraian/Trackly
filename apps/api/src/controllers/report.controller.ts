import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';

/**
 * GET /api/reports/burndown?sprintId=
 * Returns burndown chart data for a sprint.
 */
export async function getBurndown(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprintId = req.query.sprintId as string;
    const data = await reportService.getBurndown(sprintId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/velocity?projectId=
 * Returns velocity chart data for a project.
 */
export async function getVelocity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const data = await reportService.getVelocity(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/workload?projectId=
 * Returns workload distribution data for a project.
 */
export async function getWorkload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const data = await reportService.getWorkload(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/status-summary?projectId=
 * Returns issue counts and story points grouped by status.
 */
export async function getStatusSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const data = await reportService.getStatusSummary(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/sprint-health?sprintId=
 * Returns sprint health data including burn-up, scope changes, and health score.
 */
export async function sprintHealth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprintId = req.query.sprintId as string;
    const data = await reportService.getSprintHealth(sprintId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reports/burnup?sprintId=
 * Returns burn-up chart data for a sprint (total scope vs completed).
 */
export async function burnup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprintId = req.query.sprintId as string;
    const data = await reportService.getBurnup(sprintId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
