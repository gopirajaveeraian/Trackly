import { Request, Response, NextFunction } from 'express';
import * as releaseService from '../services/release.service';

/**
 * GET /api/releases?projectId=
 * Lists all releases for a project.
 */
export async function listReleases(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query.projectId as string;
    const releases = await releaseService.listReleases(projectId, req.user!.userId);

    res.status(200).json({
      success: true,
      data: releases,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/releases
 * Creates a new release.
 */
export async function createRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const release = await releaseService.createRelease(req.body, req.user!.userId);

    res.status(201).json({
      success: true,
      data: release,
      message: 'Release created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/releases/:id
 * Gets release details with issues.
 */
export async function getRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const release = await releaseService.getRelease(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      data: release,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/releases/:id
 * Updates a release.
 */
export async function updateRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const release = await releaseService.updateRelease(
      req.params.id,
      req.user!.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: release,
      message: 'Release updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/releases/:id
 * Deletes a release.
 */
export async function deleteRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await releaseService.deleteRelease(req.params.id, req.user!.userId);

    res.status(200).json({
      success: true,
      message: 'Release deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/releases/:id/issues
 * Adds an issue to a release.
 */
export async function addIssueToRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issue = await releaseService.addIssueToRelease(
      req.params.id,
      req.body.issueId,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: issue,
      message: 'Issue added to release',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/releases/:id/issues/:issueId
 * Removes an issue from a release.
 */
export async function removeIssueFromRelease(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const issue = await releaseService.removeIssueFromRelease(
      req.params.issueId,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: issue,
      message: 'Issue removed from release',
    });
  } catch (error) {
    next(error);
  }
}
