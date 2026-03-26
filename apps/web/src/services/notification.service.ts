import api from './api';
import type { Notification, ApiResponse } from '@/types';

export const notificationService = {
  async list(unread?: boolean): Promise<Notification[]> {
    const params = unread ? { unread: 'true' } : undefined;
    const response = await api.get<ApiResponse<Notification[]>>(
      '/notifications',
      { params },
    );
    return response.data.data;
  },

  async markAsRead(id: string): Promise<Notification> {
    const response = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`,
    );
    return response.data.data;
  },

  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await api.patch<ApiResponse<{ updated: number }>>(
      '/notifications/read-all',
    );
    return response.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count',
    );
    return response.data.data.count;
  },
};
