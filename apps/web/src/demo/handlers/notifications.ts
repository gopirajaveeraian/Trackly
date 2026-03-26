import { getDemoStore } from '../store';

export function handleNotifications(method: string, segments: string[], _body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /notifications/unread-count
  if (method === 'GET' && segments[0] === 'unread-count') {
    const count = store.notifications.filter((n) => !n.read).length;
    return { count };
  }

  // GET /notifications
  if (method === 'GET' && segments.length === 0) {
    const unread = params.get('unread');
    if (unread === 'true') {
      return store.notifications.filter((n) => !n.read);
    }
    return store.notifications;
  }

  // PATCH /notifications/read-all
  if (method === 'PATCH' && segments[0] === 'read-all') {
    const updated = store.markAllNotificationsRead();
    return { updated };
  }

  // PATCH /notifications/:id/read
  if (method === 'PATCH' && segments[1] === 'read') {
    return store.markNotificationRead(segments[0]);
  }

  return null;
}
