import { getDemoStore } from '../store';

export function handleAttachments(method: string, segments: string[], body: Record<string, unknown>, params: URLSearchParams) {
  const store = getDemoStore();

  // GET /attachments
  if (method === 'GET' && segments.length === 0) {
    const issueId = params.get('issueId');
    return issueId
      ? store.attachments.filter((a) => a.issueId === issueId)
      : store.attachments;
  }

  // POST /attachments
  if (method === 'POST' && segments.length === 0) {
    const issueId = (body.issueId as string) ?? '';
    const filename = (body.filename as string) ?? 'uploaded-file.pdf';
    return store.addAttachment(issueId, filename);
  }

  // DELETE /attachments/:id
  if (method === 'DELETE' && segments.length === 1) {
    store.deleteAttachment(segments[0]);
    return { success: true };
  }

  return null;
}
