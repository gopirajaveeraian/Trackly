import { Request, Response, NextFunction } from 'express';
import * as workflowService from '../services/workflow.service';

export async function listTransitions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transitions = await workflowService.listTransitions(
      req.params.projectId,
      req.user!.userId,
    );
    res.status(200).json({ success: true, data: transitions });
  } catch (error) {
    next(error);
  }
}

export async function getAllowedTransitions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const statuses = await workflowService.getAllowedTransitions(
      req.params.projectId,
      req.params.statusId,
      req.user!.userId,
    );
    res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    next(error);
  }
}

export async function addTransition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fromStatusId, toStatusId } = req.body as { fromStatusId: string; toStatusId: string };
    const transition = await workflowService.addTransition(
      req.params.projectId,
      req.user!.userId,
      fromStatusId,
      toStatusId,
    );
    res.status(201).json({ success: true, data: transition });
  } catch (error) {
    next(error);
  }
}

export async function removeTransition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await workflowService.removeTransition(req.params.transitionId, req.user!.userId);
    res.status(200).json({ success: true, data: null, message: 'Transition removed' });
  } catch (error) {
    next(error);
  }
}
