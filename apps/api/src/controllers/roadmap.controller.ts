import { Request, Response, NextFunction } from 'express';
import * as roadmapService from '../services/roadmap.service';

/**
 * GET /api/roadmap?projectId=
 * Returns roadmap data with epics and releases.
 */
export async function getRoadmap(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const data = await roadmapService.getRoadmap(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
