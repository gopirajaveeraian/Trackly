import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Package,
  ChevronDown,
  ChevronRight,
  Calendar,
  Trash2,
  Pencil,
  Rocket,
  Archive,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { projectService } from '@/services/project.service';
import {
  releaseService,
  type ReleaseWithProgress,
} from '@/services/release.service';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createReleaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
});

type CreateReleaseFormValues = z.infer<typeof createReleaseSchema>;

const editReleaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
});

type EditReleaseFormValues = z.infer<typeof editReleaseSchema>;

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

type ReleaseStatus = 'IN_PROGRESS' | 'PLANNING' | 'RELEASED' | 'ARCHIVED';

const statusConfig: Record<
  ReleaseStatus,
  { variant: 'primary' | 'warning' | 'success' | 'default'; label: string }
> = {
  IN_PROGRESS: { variant: 'primary', label: 'In Progress' },
  PLANNING: { variant: 'warning', label: 'Planning' },
  RELEASED: { variant: 'success', label: 'Released' },
  ARCHIVED: { variant: 'default', label: 'Archived' },
};

const STATUS_ORDER: ReleaseStatus[] = ['IN_PROGRESS', 'PLANNING', 'RELEASED', 'ARCHIVED'];

const STATUS_TRANSITIONS: Record<ReleaseStatus, { value: ReleaseStatus; label: string; icon: React.ReactNode }[]> = {
  PLANNING: [
    { value: 'IN_PROGRESS', label: 'Start Progress', icon: <Clock className="h-3.5 w-3.5" /> },
    { value: 'ARCHIVED', label: 'Archive', icon: <Archive className="h-3.5 w-3.5" /> },
  ],
  IN_PROGRESS: [
    { value: 'RELEASED', label: 'Release', icon: <Rocket className="h-3.5 w-3.5" /> },
    { value: 'PLANNING', label: 'Back to Planning', icon: <Clock className="h-3.5 w-3.5" /> },
  ],
  RELEASED: [
    { value: 'ARCHIVED', label: 'Archive', icon: <Archive className="h-3.5 w-3.5" /> },
  ],
  ARCHIVED: [
    { value: 'PLANNING', label: 'Reopen', icon: <Clock className="h-3.5 w-3.5" /> },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupReleasesByStatus(
  releases: ReleaseWithProgress[]
): Record<ReleaseStatus, ReleaseWithProgress[]> {
  const groups: Record<ReleaseStatus, ReleaseWithProgress[]> = {
    IN_PROGRESS: [],
    PLANNING: [],
    RELEASED: [],
    ARCHIVED: [],
  };

  for (const release of releases) {
    const status = release.status as ReleaseStatus;
    if (groups[status]) {
      groups[status].push(release);
    }
  }

  return groups;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No dates set';
  if (start && end) {
    return `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  }
  if (start) return `Starts ${format(new Date(start), 'MMM d, yyyy')}`;
  return `Release ${format(new Date(end!), 'MMM d, yyyy')}`;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function ReleasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState<ReleaseWithProgress | null>(null);
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | null>(null);

  // ---- Queries ----
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: releases, isLoading } = useQuery({
    queryKey: ['releases', projectId],
    queryFn: () => releaseService.list(projectId!),
    enabled: !!projectId,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateReleaseFormValues) =>
      releaseService.create({ ...data, projectId: projectId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases', projectId] });
      setShowCreateModal(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditReleaseFormValues }) =>
      releaseService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases', projectId] });
      setEditingRelease(null);
      editForm.reset();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      releaseService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => releaseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases', projectId] });
    },
  });

  // ---- Forms ----
  const createForm = useForm<CreateReleaseFormValues>({
    resolver: zodResolver(createReleaseSchema),
    defaultValues: { name: '', description: '', startDate: '', releaseDate: '' },
  });

  const editForm = useForm<EditReleaseFormValues>({
    resolver: zodResolver(editReleaseSchema),
  });

  function onCreateSubmit(data: CreateReleaseFormValues) {
    createMutation.mutate(data);
  }

  function onEditSubmit(data: EditReleaseFormValues) {
    if (!editingRelease) return;
    updateMutation.mutate({ id: editingRelease.id, data });
  }

  function handleEdit(release: ReleaseWithProgress) {
    editForm.reset({
      name: release.name,
      description: release.description ?? '',
      startDate: release.startDate ? release.startDate.slice(0, 10) : '',
      releaseDate: release.releaseDate ? release.releaseDate.slice(0, 10) : '',
    });
    setEditingRelease(release);
  }

  function toggleExpand(releaseId: string) {
    setExpandedReleaseId((prev) => (prev === releaseId ? null : releaseId));
  }

  // Group releases
  const grouped = groupReleasesByStatus(releases ?? []);
  const totalReleases = releases?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Releases'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              {totalReleases} release{totalReleases !== 1 ? 's' : ''} in this project
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Release
          </Button>
        </div>
      </div>

      {/* Release List */}
      {isLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      ) : totalReleases === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No releases yet"
            description="Create your first release to start tracking versions and shipping milestones."
            actionLabel="Create Release"
            onAction={() => setShowCreateModal(true)}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const releasesInGroup = grouped[status];
            if (releasesInGroup.length === 0) return null;

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[status].variant}>
                    {statusConfig[status].label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {releasesInGroup.length} release{releasesInGroup.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {releasesInGroup.map((release) => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    isExpanded={expandedReleaseId === release.id}
                    onToggleExpand={() => toggleExpand(release.id)}
                    onEdit={() => handleEdit(release)}
                    onStatusChange={(newStatus) =>
                      statusMutation.mutate({ id: release.id, status: newStatus })
                    }
                    onDelete={() => deleteMutation.mutate(release.id)}
                    onNavigateIssue={(issueId) => navigate(`/issues/${issueId}`)}
                    isUpdatingStatus={
                      statusMutation.isPending &&
                      (statusMutation.variables as { id: string } | undefined)?.id === release.id
                    }
                    isDeleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === release.id
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Release Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          createForm.reset();
        }}
        title="Create Release"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          <Input
            label="Release Name"
            placeholder="e.g. v1.0.0"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              {...createForm.register('description')}
              placeholder="What is included in this release?"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...createForm.register('startDate')}
            />
            <Input
              label="Release Date"
              type="date"
              {...createForm.register('releaseDate')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                createForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Release
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Release Modal */}
      <Modal
        isOpen={!!editingRelease}
        onClose={() => {
          setEditingRelease(null);
          editForm.reset();
        }}
        title="Edit Release"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
          <Input
            label="Release Name"
            placeholder="e.g. v1.0.0"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              {...editForm.register('description')}
              placeholder="What is included in this release?"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...editForm.register('startDate')}
            />
            <Input
              label="Release Date"
              type="date"
              {...editForm.register('releaseDate')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingRelease(null);
                editForm.reset();
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Release Card sub-component
// ---------------------------------------------------------------------------

interface ReleaseCardProps {
  release: ReleaseWithProgress;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onNavigateIssue: (issueId: string) => void;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
}

function ReleaseCard({
  release,
  isExpanded,
  onToggleExpand,
  onEdit,
  onStatusChange,
  onDelete,
  onNavigateIssue,
  isUpdatingStatus,
  isDeleting,
}: ReleaseCardProps) {
  const { data: releaseDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['release', release.id],
    queryFn: () => releaseService.get(release.id),
    enabled: isExpanded,
  });

  const status = release.status as ReleaseStatus;
  const { variant, label } = statusConfig[status];
  const transitions = STATUS_TRANSITIONS[status] ?? [];
  const progressPercent =
    release.progress.total > 0
      ? (release.progress.done / release.progress.total) * 100
      : 0;
  const issues = releaseDetail?.issues ?? [];

  return (
    <Card padding="none" hoverable>
      {/* Release header row */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Expand chevron */}
        <span className="text-gray-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        {/* Release info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate">
              {release.name}
            </span>
            <Badge variant={variant}>{label}</Badge>
          </div>

          {release.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {release.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3" />
              {formatDateRange(release.startDate, release.releaseDate)}
            </span>
            <span className="text-xs text-gray-400">
              {release._count.issues} issue{release._count.issues !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar
              value={progressPercent}
              size="sm"
              className="flex-1 max-w-xs"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {release.progress.done} of {release.progress.total} done
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {transitions.map((t) => (
            <Button
              key={t.value}
              variant="secondary"
              size="sm"
              leftIcon={t.icon}
              onClick={() => onStatusChange(t.value)}
              isLoading={isUpdatingStatus}
            >
              {t.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-3.5 w-3.5 text-danger-600" />}
            onClick={onDelete}
            isLoading={isDeleting}
          />
        </div>
      </div>

      {/* Expanded issue list */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {detailLoading ? (
            <div className="px-5 py-4 animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-100 rounded" />
                  <div className="flex-1 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-500">
              No issues linked to this release.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-5 py-2.5">Issue</th>
                    <th className="px-5 py-2.5">Type</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Priority</th>
                    <th className="px-5 py-2.5">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr
                      key={issue.id}
                      className="table-row cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateIssue(issue.id);
                      }}
                    >
                      <td className="px-5 py-2.5">
                        <span className="text-sm font-medium text-gray-900">
                          {issue.title}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge variant="default">{issue.type}</Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge
                          variant={
                            issue.status.name.toLowerCase().includes('done')
                              ? 'success'
                              : issue.status.name.toLowerCase().includes('progress')
                                ? 'primary'
                                : 'default'
                          }
                        >
                          {issue.status.name}
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge
                          variant={
                            issue.priority === 'CRITICAL' || issue.priority === 'HIGH'
                              ? 'danger'
                              : issue.priority === 'MEDIUM'
                                ? 'warning'
                                : 'primary'
                          }
                        >
                          {issue.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        {issue.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={issue.assignee.name}
                              src={issue.assignee.avatar}
                              size="xs"
                            />
                            <span className="text-sm text-gray-600">
                              {issue.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
