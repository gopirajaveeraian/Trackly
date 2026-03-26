import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';

/**
 * GET /api/notifications
 * Lists notifications for the authenticated user.
 * Query: ?unread=true to filter only unread notifications.
 */
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const onlyUnread = req.query.unread === 'true';
    const notifications = await notificationService.listNotifications(
      req.user!.userId,
      onlyUnread,
    );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user!.userId,
    );

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const count = await notificationService.markAllAsRead(req.user!.userId);

    res.status(200).json({
      success: true,
      data: { updated: count },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}
