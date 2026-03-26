import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Send,
  Calendar,
  User as UserIcon,
  Tag,
  Clock,
  MessageSquare,
  Activity,
  Edit3,
  Trash2,
  ChevronDown,
  Check,
  Paperclip,
  Upload,
  X,
  Link2,
  Eye,
  EyeOff,
  Plus,
  Zap,
  Target,
  Timer,
  GitBranch,
  ArrowRight,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, PriorityBadge, IssueTypeBadge } from '@/components/ui/Badge';
import { issueService } from '@/services/issue.service';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import { workspaceService } from '@/services/workspace.service';
import { attachmentService } from '@/services/attachment.service';
import { RichTextEditor, RichTextViewer } from '@/components/ui/RichTextEditor';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { IssueType, Priority, IssueLinkType } from '@/types';
import type {
  Attachment,
  Comment,
  ProjectStatus,
  UpdateIssueRequest,
  Issue,
  IssueLink,
  Label,
  Sprint,
} from '@/types';
import { formatDistanceToNow, format } from 'date-fns';

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

const editIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType),
  priority: z.nativeEnum(Priority),
  statusId: z.string().min(1, 'Status is required'),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  epicId: z.string().optional(),
  dueDate: z.string().optional(),
  storyPoints: z.string().optional(),
  estimate: z.string().optional(),
});

type EditIssueFormValues = z.infer<typeof editIssueSchema>;

const LINK_TYPE_LABELS: Record<string, string> = {
  BLOCKS: 'blocks',
  IS_BLOCKED_BY: 'is blocked by',
  RELATES_TO: 'relates to',
  DUPLICATES: 'duplicates',
};

const STORY_POINT_OPTIONS = [0.5, 1, 2, 3, 5, 8, 13, 21];

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentWorkspace: workspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [showStoryPointsDropdown, setShowStoryPointsDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showSprintDropdown, setShowSprintDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const spDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text editor state
  const [commentContent, setCommentContent] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Link modal state
  const [linkType, setLinkType] = useState<IssueLinkType>(IssueLinkType.BLOCKS);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');

  // Time log modal state
  const [timeLogHours, setTimeLogHours] = useState('');
  const [timeLogDesc, setTimeLogDesc] = useState('');

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => issueService.get(id!),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['issue-comments', id],
    queryFn: () => issueService.getComments(id!),
    enabled: !!id,
  });

  const { data: activity } = useQuery({
    queryKey: ['issue-activity', id],
    queryFn: () => issueService.getActivity(id!),
    enabled: !!id && activeTab === 'activity',
  });

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses', issue?.projectId],
    queryFn: () => projectService.getStatuses(issue!.projectId),
    enabled: !!issue?.projectId,
  });

  const { data: attachments } = useQuery({
    queryKey: ['issue-attachments', id],
    queryFn: () => attachmentService.list(id!),
    enabled: !!id,
  });

  const { data: sprints } = useQuery({
    queryKey: ['project-sprints', issue?.projectId],
    queryFn: () => sprintService.list(issue!.projectId),
    enabled: !!issue?.projectId,
  });

  const { data: members } = useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: () => workspaceService.getMembers(workspace!.id),
    enabled: !!workspace?.id,
    select: (data) => data.filter((m) => m.user != null),
  });

  const { data: labels } = useQuery({
    queryKey: ['project-labels', issue?.projectId],
    queryFn: () => issueService.listLabels(issue!.projectId),
    enabled: !!issue?.projectId,
  });

  const { data: searchIssues } = useQuery({
    queryKey: ['issues-search', issue?.projectId, linkSearch],
    queryFn: () =>
      issueService.list({ projectId: issue!.projectId, search: linkSearch }),
    enabled: !!issue?.projectId && linkSearch.length >= 2,
    select: (data) => data.data.filter((i) => i.id !== id),
  });

  // ─── Mutations ──────────────────────────────────────────────────────────

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-attachments', id] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => attachmentService.delete(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-attachments', id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string }) => issueService.addComment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-comments', id] });
      commentReset();
      setCommentContent('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => issueService.delete(id!),
    onSuccess: () => navigate(-1),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateIssueRequest) => issueService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-activity', id] });
      setShowEditModal(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (statusId: string) => issueService.updateStatus(id!, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-activity', id] });
      setShowStatusDropdown(false);
    },
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: (data: UpdateIssueRequest) => issueService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-activity', id] });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: () =>
      issueService.addLink(id!, { type: linkType, targetIssueId: linkTargetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      setShowLinkModal(false);
      setLinkSearch('');
      setLinkTargetId('');
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: (linkId: string) => issueService.removeLink(id!, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  const addWatcherMutation = useMutation({
    mutationFn: () => issueService.addWatcher(id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  const removeWatcherMutation = useMutation({
    mutationFn: () => issueService.removeWatcher(id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  const addTimeLogMutation = useMutation({
    mutationFn: () =>
      issueService.addTimeLog(id!, {
        hours: parseFloat(timeLogHours),
        description: timeLogDesc || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      setShowTimeLogModal(false);
      setTimeLogHours('');
      setTimeLogDesc('');
    },
  });

  const removeTimeLogMutation = useMutation({
    mutationFn: (timeLogId: string) => issueService.removeTimeLog(id!, timeLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  // ─── Forms ──────────────────────────────────────────────────────────────

  const {
    register: commentRegister,
    handleSubmit: commentHandleSubmit,
    reset: commentReset,
    formState: { errors: commentErrors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    watch: editWatch,
    setValue: editSetValue,
    formState: { errors: editErrors },
  } = useForm<EditIssueFormValues>({
    resolver: zodResolver(editIssueSchema),
  });

  const selectedType = editWatch('type');
  const selectedPriority = editWatch('priority');

  // ─── Effects ────────────────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target))
        setShowStatusDropdown(false);
      if (spDropdownRef.current && !spDropdownRef.current.contains(target))
        setShowStoryPointsDropdown(false);
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(target))
        setShowAssigneeDropdown(false);
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(target))
        setShowSprintDropdown(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────

  function onSubmitComment() {
    if (!commentContent.trim() || commentContent === '<p></p>') return;
    addCommentMutation.mutate({ content: commentContent });
  }

  function openEditModal() {
    if (!issue) return;
    editReset({
      title: issue.title,
      description: issue.description ?? '',
      type: issue.type,
      priority: issue.priority,
      statusId: issue.statusId,
      assigneeId: issue.assigneeId ?? '',
      sprintId: issue.sprintId ?? '',
      epicId: issue.epicId ?? '',
      dueDate: issue.dueDate ? issue.dueDate.split('T')[0] : '',
      storyPoints: issue.storyPoints != null ? String(issue.storyPoints) : '',
      estimate: issue.estimate != null ? String(issue.estimate) : '',
    });
    setEditDescription(issue.description ?? '');
    setShowEditModal(true);
  }

  function onSubmitEdit(data: EditIssueFormValues) {
    const payload: UpdateIssueRequest = {
      title: data.title,
      description: editDescription || undefined,
      type: data.type,
      priority: data.priority,
      statusId: data.statusId,
      assigneeId: data.assigneeId || null,
      sprintId: data.sprintId || null,
      epicId: data.epicId || null,
      dueDate: data.dueDate || null,
      storyPoints: data.storyPoints ? parseFloat(data.storyPoints) : null,
      estimate: data.estimate ? parseFloat(data.estimate) : null,
    };
    updateMutation.mutate(payload);
  }

  const isWatching = issue?.watchers?.some((w) => w.userId === user?.id) ?? false;
  const issueKey = issue?.project
    ? `${issue.project.key}-${issue.number}`
    : `#${issue?.number}`;

  // ─── Loading / Not Found ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 bg-gray-100 rounded-lg" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-gray-500">Issue not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {issue.project && (
          <>
            <Link
              to={`/board/${issue.projectId}`}
              className="text-gray-500 hover:text-primary-600"
            >
              {issue.project.name}
            </Link>
            <span className="text-gray-300">/</span>
          </>
        )}
        <span className="text-gray-700 font-medium">{issueKey}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ──── Main Content (Left 2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <IssueTypeBadge type={issue.type} />
              <span className="text-sm text-gray-500 font-mono">{issueKey}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            {issue.description ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <RichTextViewer content={issue.description} />
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No description</p>
            )}
          </div>

          {/* Sub-tasks */}
          {issue.subTasks && issue.subTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Child Issues
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">
                  {issue.subTasks.length}
                </span>
              </h3>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {issue.subTasks.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/issues/${sub.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <IssueTypeBadge type={sub.type} />
                    <span className="text-sm text-gray-900 flex-1 truncate">
                      {sub.title}
                    </span>
                    <PriorityBadge priority={sub.priority} />
                    <Badge
                      variant={
                        sub.status.name.toLowerCase().includes('done')
                          ? 'success'
                          : sub.status.name.toLowerCase().includes('progress')
                            ? 'primary'
                            : 'default'
                      }
                    >
                      {sub.status.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Linked Issues */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linked Issues
                {issue.links && issue.links.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">
                    {issue.links.length}
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowLinkModal(true)}
              >
                Link Issue
              </Button>
            </div>
            {issue.links && issue.links.length > 0 ? (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {issue.links.map((link: IssueLink) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 px-3 py-2.5 group hover:bg-gray-50"
                  >
                    <span className="text-xs text-gray-500 w-24 flex-shrink-0">
                      {LINK_TYPE_LABELS[link.type] || link.type}
                    </span>
                    <IssueTypeBadge type={link.linkedIssue.type} />
                    <Link
                      to={`/issues/${link.linkedIssue.id}`}
                      className="text-sm text-primary-600 hover:underline flex-1 truncate"
                    >
                      {link.linkedIssue.project?.key}-{link.linkedIssue.number}{' '}
                      {link.linkedIssue.title}
                    </Link>
                    <Badge
                      variant={
                        link.linkedIssue.status.name.toLowerCase().includes('done')
                          ? 'success'
                          : link.linkedIssue.status.name.toLowerCase().includes('progress')
                            ? 'primary'
                            : 'default'
                      }
                    >
                      {link.linkedIssue.status.name}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removeLinkMutation.mutate(link.id)}
                      className="text-gray-400 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                No linked issues
              </p>
            )}
          </div>

          {/* Tabs: Comments / Activity */}
          <div>
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(activeTab === 'comments' ? 'tab-active' : 'tab')}
              >
                <MessageSquare className="h-4 w-4 mr-1.5 inline" />
                Comments
                {(comments ?? []).length > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">
                    {(comments ?? []).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={cn(activeTab === 'activity' ? 'tab-active' : 'tab')}
              >
                <Activity className="h-4 w-4 mr-1.5 inline" />
                Activity
              </button>
            </div>

            <div className="mt-4">
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Avatar name={user?.name ?? 'User'} src={user?.avatar} size="sm" />
                    <div className="flex-1">
                      <RichTextEditor
                        content={commentContent}
                        onChange={setCommentContent}
                        placeholder="Add a comment... Use @name to mention someone"
                        minHeight="80px"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          isLoading={addCommentMutation.isPending}
                          onClick={onSubmitComment}
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(comments ?? []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No comments yet. Be the first to comment.
                    </p>
                  ) : (
                    (comments ?? []).map((comment: Comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar name={comment.author.name} src={comment.author.avatar} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="mt-1">
                            <RichTextViewer content={comment.content} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {(activity ?? []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No activity recorded yet.
                    </p>
                  ) : (
                    (activity ?? []).map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-2">
                        <Avatar name={item.user.name} src={item.user.avatar} size="xs" />
                        <div>
                          <p className="text-sm text-gray-600">{item.message}</p>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
                {(attachments ?? []).length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">
                    {(attachments ?? []).length}
                  </span>
                )}
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAttachmentMutation.mutate(file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  isLoading={uploadAttachmentMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload
                </Button>
              </div>
            </div>

            {(attachments ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                No attachments
              </p>
            ) : (
              <div className="space-y-1">
                {(attachments ?? []).map((attachment: Attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group"
                  >
                    <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 text-sm text-primary-600 hover:underline truncate"
                    >
                      {attachment.filename}
                    </a>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this attachment?'))
                          deleteAttachmentMutation.mutate(attachment.id);
                      }}
                      className="text-gray-400 hover:text-danger-600 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ──── Sidebar (Right 1/3) ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setShowStatusDropdown((prev) => !prev)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  issue.status.name.toLowerCase().includes('done')
                    ? 'bg-success-50 text-success-700'
                    : issue.status.name.toLowerCase().includes('progress')
                      ? 'bg-primary-50 text-primary-700'
                      : 'bg-gray-100 text-gray-700'
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: issue.status.color }}
                  />
                  {issue.status.name}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showStatusDropdown && (
                <div className="absolute left-0 top-full mt-1 z-20 w-full bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                  {(statuses ?? []).map((status: ProjectStatus) => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => updateStatusMutation.mutate(status.id)}
                      disabled={updateStatusMutation.isPending}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors',
                        status.id === issue.statusId
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </span>
                      {status.id === issue.statusId && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Details Card */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3.5">
              {/* Priority */}
              <DetailRow label="Priority" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                <PriorityBadge priority={issue.priority} />
              </DetailRow>

              {/* Assignee - Inline changeable */}
              <div className="relative" ref={assigneeDropdownRef}>
                <DetailRow
                  label="Assignee"
                  icon={<UserIcon className="h-3.5 w-3.5" />}
                  onClick={() => setShowAssigneeDropdown((prev) => !prev)}
                  clickable
                >
                  {issue.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={issue.assignee.name} src={issue.assignee.avatar} size="xs" />
                      <span className="text-sm text-gray-900">{issue.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </DetailRow>

                {showAssigneeDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        inlineUpdateMutation.mutate({ assigneeId: null });
                        setShowAssigneeDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-500 hover:bg-gray-50"
                    >
                      Unassigned
                    </button>
                    {(members ?? []).map((m) => {
                      const u = m.user!;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            inlineUpdateMutation.mutate({ assigneeId: u.id });
                            setShowAssigneeDropdown(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                            u.id === issue.assigneeId
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          <Avatar name={u.name} src={u.avatar} size="xs" />
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reporter */}
              <DetailRow label="Reporter" icon={<UserIcon className="h-3.5 w-3.5" />}>
                <div className="flex items-center gap-2">
                  <Avatar name={issue.reporter.name} src={issue.reporter.avatar} size="xs" />
                  <span className="text-sm text-gray-900">{issue.reporter.name}</span>
                </div>
              </DetailRow>

              {/* Labels */}
              <DetailRow label="Labels" icon={<Tag className="h-3.5 w-3.5" />}>
                {issue.labels && issue.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.map((label: Label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </DetailRow>

              {/* Story Points - Inline changeable */}
              <div className="relative" ref={spDropdownRef}>
                <DetailRow
                  label="Story Points"
                  icon={<Zap className="h-3.5 w-3.5" />}
                  onClick={() => setShowStoryPointsDropdown((prev) => !prev)}
                  clickable
                >
                  <span className="text-sm text-gray-900">
                    {issue.storyPoints != null ? issue.storyPoints : '-'}
                  </span>
                </DetailRow>

                {showStoryPointsDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                    <button
                      type="button"
                      onClick={() => {
                        inlineUpdateMutation.mutate({ storyPoints: null });
                        setShowStoryPointsDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-sm text-left text-gray-500 hover:bg-gray-50"
                    >
                      None
                    </button>
                    {STORY_POINT_OPTIONS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => {
                          inlineUpdateMutation.mutate({ storyPoints: sp });
                          setShowStoryPointsDropdown(false);
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-sm text-left transition-colors',
                          sp === issue.storyPoints
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sprint - Inline changeable */}
              <div className="relative" ref={sprintDropdownRef}>
                <DetailRow
                  label="Sprint"
                  icon={<Target className="h-3.5 w-3.5" />}
                  onClick={() => setShowSprintDropdown((prev) => !prev)}
                  clickable
                >
                  <span className="text-sm text-gray-900">
                    {issue.sprint ? issue.sprint.name : 'Backlog'}
                  </span>
                </DetailRow>

                {showSprintDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        inlineUpdateMutation.mutate({ sprintId: null });
                        setShowSprintDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-500 hover:bg-gray-50"
                    >
                      Backlog (no sprint)
                    </button>
                    {(sprints ?? []).map((sprint: Sprint) => (
                      <button
                        key={sprint.id}
                        type="button"
                        onClick={() => {
                          inlineUpdateMutation.mutate({ sprintId: sprint.id });
                          setShowSprintDropdown(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors',
                          sprint.id === issue.sprintId
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span>{sprint.name}</span>
                        <span className="text-xs text-gray-400">{sprint.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Epic / Parent */}
              <DetailRow label="Epic / Parent" icon={<GitBranch className="h-3.5 w-3.5" />}>
                {issue.epic ? (
                  <Link
                    to={`/issues/${issue.epic.id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    {issue.project?.key}-{issue.epic.number} {issue.epic.title}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </DetailRow>

              {/* Due date */}
              <DetailRow label="Due Date" icon={<Calendar className="h-3.5 w-3.5" />}>
                <span
                  className={cn(
                    'text-sm',
                    issue.dueDate && new Date(issue.dueDate) < new Date()
                      ? 'text-danger-600 font-medium'
                      : 'text-gray-900'
                  )}
                >
                  {issue.dueDate
                    ? format(new Date(issue.dueDate), 'MMM d, yyyy')
                    : 'No due date'}
                </span>
              </DetailRow>

              {/* Created */}
              <DetailRow label="Created" icon={<Clock className="h-3.5 w-3.5" />}>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </span>
              </DetailRow>

              {/* Updated */}
              <DetailRow label="Updated" icon={<Clock className="h-3.5 w-3.5" />}>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                </span>
              </DetailRow>
            </div>
          </Card>

          {/* Time Tracking Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Time Tracking
              </h3>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowTimeLogModal(true)}
              >
                Log
              </Button>
            </div>

            <div className="space-y-2">
              {/* Time bar */}
              {(issue.estimate ?? 0) > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={cn(
                      'h-2.5 rounded-full transition-all',
                      (issue.timeSpent ?? 0) > (issue.estimate ?? 0)
                        ? 'bg-danger-500'
                        : 'bg-primary-500'
                    )}
                    style={{
                      width: `${Math.min(100, ((issue.timeSpent ?? 0) / (issue.estimate ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-500">Logged</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {issue.timeSpent ?? 0}h
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Estimated</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {issue.estimate ?? 0}h
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {Math.max(0, (issue.estimate ?? 0) - (issue.timeSpent ?? 0))}h
                  </div>
                </div>
              </div>

              {/* Recent time logs */}
              {issue.timeLogs && issue.timeLogs.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2 space-y-1.5">
                  {issue.timeLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-xs group">
                      <div className="flex items-center gap-2">
                        <Avatar name={log.user.name} src={log.user.avatar} size="xs" />
                        <span className="text-gray-600">{log.hours}h</span>
                        {log.description && (
                          <span className="text-gray-400 truncate max-w-[120px]">
                            - {log.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">
                          {formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTimeLogMutation.mutate(log.id)}
                          className="text-gray-400 hover:text-danger-600 opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Watchers Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Watchers
                {issue.watchers && issue.watchers.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">
                    {issue.watchers.length}
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  isWatching ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )
                }
                onClick={() =>
                  isWatching ? removeWatcherMutation.mutate() : addWatcherMutation.mutate()
                }
                isLoading={addWatcherMutation.isPending || removeWatcherMutation.isPending}
              >
                {isWatching ? 'Unwatch' : 'Watch'}
              </Button>
            </div>
            {issue.watchers && issue.watchers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {issue.watchers.map((w) => (
                  <Avatar key={w.id} name={w.user.name} src={w.user.avatar} size="sm" />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No watchers</p>
            )}
          </Card>

          {/* Actions Card */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Edit3 className="h-4 w-4" />}
                onClick={openEditModal}
              >
                Edit Issue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                leftIcon={<Trash2 className="h-4 w-4" />}
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this issue?'))
                    deleteMutation.mutate();
                }}
              >
                Delete Issue
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ──── Edit Issue Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          editReset();
        }}
        title="Edit Issue"
        size="lg"
      >
        <form onSubmit={editHandleSubmit(onSubmitEdit)} className="space-y-5">
          <Input
            label="Title"
            placeholder="Issue title"
            error={editErrors.title?.message}
            {...editRegister('title')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <RichTextEditor
              content={editDescription}
              onChange={setEditDescription}
              placeholder="Add more details..."
              minHeight="120px"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(IssueType).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => editSetValue('type', type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      selectedType === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(Priority).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => editSetValue('priority', priority)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      selectedPriority === priority
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                {...editRegister('statusId')}
                className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              >
                <option value="">Select status</option>
                {(statuses ?? []).map((status: ProjectStatus) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
              <select
                {...editRegister('assigneeId')}
                className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => (
                  <option key={m.user!.id} value={m.user!.id}>
                    {m.user!.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
              <select
                {...editRegister('sprintId')}
                className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              >
                <option value="">Backlog</option>
                {(sprints ?? []).map((sprint: Sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Due Date"
              type="date"
              {...editRegister('dueDate')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Story Points"
              type="number"
              step="0.5"
              placeholder="e.g. 5"
              {...editRegister('storyPoints')}
            />
            <Input
              label="Estimate (hours)"
              type="number"
              step="0.5"
              placeholder="e.g. 8"
              {...editRegister('estimate')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                editReset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ──── Link Issue Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkSearch('');
          setLinkTargetId('');
        }}
        title="Link Issue"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Type</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as IssueLinkType)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              {Object.values(IssueLinkType).map((lt) => (
                <option key={lt} value={lt}>
                  {LINK_TYPE_LABELS[lt] || lt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search Issue
            </label>
            <Input
              placeholder="Search by title or key..."
              value={linkSearch}
              onChange={(e) => {
                setLinkSearch(e.target.value);
                setLinkTargetId('');
              }}
            />
          </div>

          {searchIssues && searchIssues.length > 0 && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {searchIssues.map((si: Issue) => (
                <button
                  key={si.id}
                  type="button"
                  onClick={() => {
                    setLinkTargetId(si.id);
                    setLinkSearch(`${si.project?.key ?? ''}-${si.number} ${si.title}`);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                    linkTargetId === si.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <IssueTypeBadge type={si.type} />
                  <span className="font-mono text-xs text-gray-500">
                    {si.project?.key}-{si.number}
                  </span>
                  <span className="truncate">{si.title}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowLinkModal(false);
                setLinkSearch('');
                setLinkTargetId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addLinkMutation.mutate()}
              isLoading={addLinkMutation.isPending}
              disabled={!linkTargetId}
            >
              Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──── Log Time Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showTimeLogModal}
        onClose={() => {
          setShowTimeLogModal(false);
          setTimeLogHours('');
          setTimeLogDesc('');
        }}
        title="Log Time"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Hours"
            type="number"
            step="0.25"
            min="0.01"
            max="24"
            placeholder="e.g. 2.5"
            value={timeLogHours}
            onChange={(e) => setTimeLogHours(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              placeholder="What did you work on?"
              rows={2}
              value={timeLogDesc}
              onChange={(e) => setTimeLogDesc(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTimeLogModal(false);
                setTimeLogHours('');
                setTimeLogDesc('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addTimeLogMutation.mutate()}
              isLoading={addTimeLogMutation.isPending}
              disabled={!timeLogHours || parseFloat(timeLogHours) <= 0}
            >
              Log Time
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function DetailRow({
  label,
  icon,
  children,
  onClick,
  clickable,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  clickable?: boolean;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full',
        clickable && 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md transition-colors'
      )}
    >
      <span className="text-xs text-gray-500 flex items-center gap-1.5 flex-shrink-0">
        {icon}
        {label}
      </span>
      <div className="ml-3">{children}</div>
    </Wrapper>
  );
}
