import { Request, Response, NextFunction } from 'express';
import * as capacityService from '../services/capacity.service';

/**
 * GET /api/capacities?sprintId=
 * Lists all capacities for a sprint.
 */
export async function listCapacities(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sprintId = req.query.sprintId as string;
    const capacities = await capacityService.listCapacities(sprintId, req.user!.userId);

    res.status(200).json({
      success: true,
      data: capacities,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/capacities
 * Creates or updates a capacity entry.
 */
export async function upsertCapacity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sprintId, userId: targetUserId, availableHours } = req.body;
    const capacity = await capacityService.upsertCapacity(
      sprintId,
      req.user!.userId,
      targetUserId,
      availableHours,
    );

    res.status(201).json({
      success: true,
      data: capacity,
      message: 'Capacity updated',
    });
  } catch (error) {
    next(error);
  }
}
