import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, joinProject, leaveProject } from '@/services/socket.service';
import type { Issue } from '@/types';

/**
 * Hook that listens to Socket.io events for a project and
 * automatically invalidates React Query caches when data changes.
 */
export function useProjectSocket(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join project room
    joinProject(projectId);
    joinedRef.current = projectId;

    // Listen for real-time events
    const handleIssueCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
    };

    const handleIssueUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
    };

    const handleIssueStatusChanged = (data: { issueId: string; statusId: string; issue: Issue }) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['issues', { projectId }],
        (old: { data: Issue[]; total: number; page: number; limit: number; hasMore: boolean } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((issue: Issue) =>
              issue.id === data.issueId ? { ...issue, statusId: data.statusId } : issue
            ),
          };
        }
      );
    };

    const handleIssueDeleted = (data: { issueId: string }) => {
      queryClient.setQueryData(
        ['issues', { projectId }],
        (old: { data: Issue[]; total: number; page: number; limit: number; hasMore: boolean } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((issue: Issue) => issue.id !== data.issueId),
          };
        }
      );
    };

    const handleCommentAdded = (data: { issueId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['issue', data.issueId] });
    };

    socket.on('issue:created', handleIssueCreated);
    socket.on('issue:updated', handleIssueUpdated);
    socket.on('issue:status-changed', handleIssueStatusChanged);
    socket.on('issue:deleted', handleIssueDeleted);
    socket.on('issue:comment-added', handleCommentAdded);

    return () => {
      if (joinedRef.current) {
        leaveProject(joinedRef.current);
        joinedRef.current = null;
      }
      socket.off('issue:created', handleIssueCreated);
      socket.off('issue:updated', handleIssueUpdated);
      socket.off('issue:status-changed', handleIssueStatusChanged);
      socket.off('issue:deleted', handleIssueDeleted);
      socket.off('issue:comment-added', handleCommentAdded);
    };
  }, [projectId, queryClient]);
}
