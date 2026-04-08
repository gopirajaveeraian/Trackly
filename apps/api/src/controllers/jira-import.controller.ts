import { Request, Response, NextFunction } from 'express';
import * as jiraImportService from '../services/jira-import.service';

/**
 * POST /api/jira-import
 * Imports a full Jira project into Trackly.
 * Expects body: { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, workspaceId }
 */
export async function importProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jiraBaseUrl, jiraEmail, jiraApiToken, jiraProjectKey, workspaceId } = req.body;

    const result = await jiraImportService.importJiraProject({
      jiraBaseUrl,
      jiraEmail,
      jiraApiToken,
      jiraProjectKey,
      workspaceId,
      userId: req.user!.userId,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Import completed',
    });
  } catch (error) {
    next(error);
  }
}
