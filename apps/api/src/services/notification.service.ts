import { Server as SocketIOServer } from 'socket.io';
import { NotificationType } from '@prisma/client';
import { prisma } from '../config/db';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';

interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  userId: string;
  issueId?: string;
}

/**
 * Lists notifications for a user, sorted by createdAt desc.
 *
 * @param userId - The user whose notifications to fetch
 * @param onlyUnread - If true, only return unread notifications
 * @returns List of notifications (max 50)
 */
export async function listNotifications(userId: string, onlyUnread?: boolean) {
  const where: { userId: string; read?: boolean } = { userId };

  if (onlyUnread) {
    where.read = false;
  }

  return prisma.notification.findMany({
    where,
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          number: true,
          project: { select: { key: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Marks a single notification as read.
 *
 * @param notificationId - The notification ID
 * @param userId - The requesting user's ID (must own the notification)
 * @returns The updated notification
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError('You do not have access to this notification');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Marks all notifications as read for a user.
 *
 * @param userId - The user whose notifications to mark as read
 * @returns The count of updated notifications
 */
export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return result.count;
}

/**
 * Returns the count of unread notifications for a user.
 *
 * @param userId - The user whose unread count to fetch
 * @returns The unread notification count
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Creates a notification in the database AND emits it via socket.io
 * to the target user's room for real-time delivery.
 *
 * @param io - The Socket.io server instance
 * @param data - The notification data
 * @returns The created notification
 */
export async function createAndEmit(io: SocketIOServer, data: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      message: data.message,
      userId: data.userId,
      issueId: data.issueId,
    },
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          number: true,
          project: { select: { key: true } },
        },
      },
    },
  });

  // Emit the notification to the user's personal room
  io.to(`user:${data.userId}`).emit('notification:new', notification);

  return notification;
}
