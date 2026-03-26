import { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/search.service';

/**
 * Handles global search requests.
 */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req.query.q as string) ?? '';
    const workspaceId = req.query.workspaceId as string;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'workspaceId query parameter is required',
        statusCode: 400,
      });
      return;
    }

    const results = await searchService.globalSearch(query, workspaceId, req.user!.userId, limit);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}
