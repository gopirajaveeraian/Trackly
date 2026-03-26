import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Play,
  CheckCircle2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
  ListTodo,
  Bug,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import { issueService } from '@/services/issue.service';
import { cn } from '@/utils/cn';
import { SprintStatus, IssueType } from '@/types';
import type { Sprint, Issue } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

const createSprintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type CreateSprintFormValues = z.infer<typeof createSprintSchema>;

const editSprintSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type EditSprintFormValues = z.infer<typeof editSprintSchema>;

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

const statusConfig: Record<
  SprintStatus,
  { variant: 'success' | 'primary' | 'default'; label: string }
> = {
  [SprintStatus.ACTIVE]: { variant: 'success', label: 'Active' },
  [SprintStatus.PLANNED]: { variant: 'primary', label: 'Planned' },
  [SprintStatus.COMPLETED]: { variant: 'default', label: 'Completed' },
};

function groupSprintsByStatus(sprints: Sprint[]): Record<SprintStatus, Sprint[]> {
  const groups: Record<SprintStatus, Sprint[]> = {
    [SprintStatus.ACTIVE]: [],
    [SprintStatus.PLANNED]: [],
    [SprintStatus.COMPLETED]: [],
  };

  for (const sprint of sprints) {
    groups[sprint.status].push(sprint);
  }

  return groups;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No dates set';
  if (start && end) {
    return `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  }
  if (start) return `Starts ${format(new Date(start), 'MMM d, yyyy')}`;
  return `Ends ${format(new Date(end!), 'MMM d, yyyy')}`;
}

export function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [expandedSprintId, setExpandedSprintId] = useState<string | null>(null);

  // ---- Queries ----
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: sprints, isLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintService.list(projectId!),
    enabled: !!projectId,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateSprintFormValues) =>
      sprintService.create({ ...data, projectId: projectId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setShowCreateModal(false);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditSprintFormValues }) =>
      sprintService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setEditingSprint(null);
      editForm.reset();
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => sprintService.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => sprintService.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  // ---- Forms ----
  const createForm = useForm<CreateSprintFormValues>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: { name: '', goal: '', startDate: '', endDate: '' },
  });

  const editForm = useForm<EditSprintFormValues>({
    resolver: zodResolver(editSprintSchema),
  });

  function onCreateSubmit(data: CreateSprintFormValues) {
    createMutation.mutate(data);
  }

  function onEditSubmit(data: EditSprintFormValues) {
    if (!editingSprint) return;
    updateMutation.mutate({ id: editingSprint.id, data });
  }

  function handleEdit(sprint: Sprint) {
    editForm.reset({
      name: sprint.name,
      goal: sprint.goal ?? '',
      startDate: sprint.startDate ? sprint.startDate.slice(0, 10) : '',
      endDate: sprint.endDate ? sprint.endDate.slice(0, 10) : '',
    });
    setEditingSprint(sprint);
  }

  function toggleExpand(sprintId: string) {
    setExpandedSprintId((prev) => (prev === sprintId ? null : sprintId));
  }

  // Group sprints
  const grouped = groupSprintsByStatus(sprints ?? []);
  const statusOrder: SprintStatus[] = [
    SprintStatus.ACTIVE,
    SprintStatus.PLANNED,
    SprintStatus.COMPLETED,
  ];

  const totalSprints = sprints?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Sprints'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              {totalSprints} sprint{totalSprints !== 1 ? 's' : ''} in this project
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Sprint
          </Button>
        </div>
      </div>

      {/* Sprint List */}
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
      ) : totalSprints === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="h-8 w-8" />}
            title="No sprints yet"
            description="Create your first sprint to start organizing work into iterations."
            actionLabel="Create Sprint"
            onAction={() => setShowCreateModal(true)}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const sprintsInGroup = grouped[status];
            if (sprintsInGroup.length === 0) return null;

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[status].variant}>
                    {statusConfig[status].label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {sprintsInGroup.length} sprint{sprintsInGroup.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {sprintsInGroup.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    isExpanded={expandedSprintId === sprint.id}
                    onToggleExpand={() => toggleExpand(sprint.id)}
                    onEdit={() => handleEdit(sprint)}
                    onStart={() => startMutation.mutate(sprint.id)}
                    onComplete={() => completeMutation.mutate(sprint.id)}
                    isStarting={
                      startMutation.isPending &&
                      startMutation.variables === sprint.id
                    }
                    isCompleting={
                      completeMutation.isPending &&
                      completeMutation.variables === sprint.id
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Sprint Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          createForm.reset();
        }}
        title="Create Sprint"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          <Input
            label="Sprint Name"
            placeholder="e.g. Sprint 1"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Goal (optional)
            </label>
            <textarea
              {...createForm.register('goal')}
              placeholder="What do you want to achieve in this sprint?"
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
              label="End Date"
              type="date"
              {...createForm.register('endDate')}
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
              Create Sprint
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Sprint Modal */}
      <Modal
        isOpen={!!editingSprint}
        onClose={() => {
          setEditingSprint(null);
          editForm.reset();
        }}
        title="Edit Sprint"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
          <Input
            label="Sprint Name"
            placeholder="e.g. Sprint 1"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Goal (optional)
            </label>
            <textarea
              {...editForm.register('goal')}
              placeholder="What do you want to achieve in this sprint?"
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
              label="End Date"
              type="date"
              {...editForm.register('endDate')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingSprint(null);
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

// ---- Sprint Card sub-component ----

interface SprintCardProps {
  sprint: Sprint;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onStart: () => void;
  onComplete: () => void;
  isStarting: boolean;
  isCompleting: boolean;
}

function SprintCard({
  sprint,
  isExpanded,
  onToggleExpand,
  onEdit,
  onStart,
  onComplete,
  isStarting,
  isCompleting,
}: SprintCardProps) {
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', { sprintId: sprint.id }],
    queryFn: () => issueService.list({ sprintId: sprint.id }),
    enabled: isExpanded,
  });

  // Fetch issue count eagerly (lightweight query for the badge)
  const { data: countData } = useQuery({
    queryKey: ['issues', { sprintId: sprint.id, countOnly: true }],
    queryFn: () => issueService.list({ sprintId: sprint.id }),
  });

  const issueCount = countData?.total ?? 0;
  const issues = issuesData?.data ?? [];
  const { variant, label } = statusConfig[sprint.status];

  return (
    <Card padding="none" hoverable>
      {/* Sprint header row */}
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

        {/* Sprint info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {sprint.name}
            </span>
            <Badge variant={variant}>{label}</Badge>
          </div>

          {sprint.goal && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {sprint.goal}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(sprint.startDate, sprint.endDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {sprint.status === SprintStatus.PLANNED && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={onStart}
              isLoading={isStarting}
            >
              Start
            </Button>
          )}
          {sprint.status === SprintStatus.ACTIVE && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={onComplete}
              isLoading={isCompleting}
            >
              Complete
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Expanded issue list */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {issuesLoading ? (
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
              No issues in this sprint.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-5 py-2.5 w-8" />
                    <th className="px-5 py-2.5">Issue</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Priority</th>
                    <th className="px-5 py-2.5">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue: Issue) => (
                    <tr key={issue.id} className="table-row">
                      <td className="px-5 py-2.5">
                        {issueTypeIcons[issue.type]}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="text-sm font-medium text-gray-900">
                          {issue.title}
                        </span>
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
                        <PriorityBadge priority={issue.priority} />
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
