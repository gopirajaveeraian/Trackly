import api from './api';
import type { Attachment, ApiResponse } from '@/types';

export const attachmentService = {
  async list(issueId: string): Promise<Attachment[]> {
    const response = await api.get<ApiResponse<Attachment[]>>(
      '/attachments',
      { params: { issueId } }
    );
    return response.data.data;
  },

  async upload(issueId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('issueId', issueId);

    const response = await api.post<ApiResponse<Attachment>>(
      '/attachments',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/attachments/${id}`);
  },
};
