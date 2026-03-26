import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  Bug,
  ListTodo,
  BookOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { projectService } from '@/services/project.service';
import { issueService } from '@/services/issue.service';
import { cn } from '@/utils/cn';
import { IssueType, Priority } from '@/types';
import type { Issue, CreateIssueRequest, ProjectStatus } from '@/types';

const createEpicSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority),
});

type CreateEpicFormValues = z.infer<typeof createEpicSchema>;

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

export function EpicsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);

  // ---- Queries ----

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses', projectId],
    queryFn: () => projectService.getStatuses(projectId!),
    enabled: !!projectId,
  });

  const { data: epicsData, isLoading: epicsLoading } = useQuery({
    queryKey: ['issues', { projectId, type: IssueType.EPIC }],
    queryFn: () => issueService.list({ projectId, type: IssueType.EPIC }),
    enabled: !!projectId,
  });

  // Fetch ALL project issues once so we can derive children per epic
  const { data: allIssuesData } = useQuery({
    queryKey: ['issues', { projectId }],
    queryFn: () => issueService.list({ projectId }),
    enabled: !!projectId,
  });

  const epics = epicsData?.data ?? [];
  const allIssues = allIssuesData?.data ?? [];

  // Build a map of epicId -> child issues
  const childrenByEpicId = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    for (const issue of allIssues) {
      if (issue.epicId) {
        if (!map[issue.epicId]) {
          map[issue.epicId] = [];
        }
        map[issue.epicId].push(issue);
      }
    }
    return map;
  }, [allIssues]);

  // ---- Form ----

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEpicFormValues>({
    resolver: zodResolver(createEpicSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: Priority.MEDIUM,
    },
  });

  const selectedPriority = watch('priority');

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: (data: CreateIssueRequest) => issueService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId, type: IssueType.EPIC }] });
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
      setShowCreateModal(false);
      reset();
    },
  });

  function onSubmit(data: CreateEpicFormValues) {
    if (!projectId) return;
    const defaultStatusId = (statuses ?? []).length > 0 ? statuses![0].id : '';
    if (!defaultStatusId) return;

    createMutation.mutate({
      title: data.title,
      description: data.description,
      type: IssueType.EPIC,
      priority: data.priority,
      statusId: defaultStatusId,
      projectId,
    });
  }

  function toggleExpand(epicId: string) {
    setExpandedEpicId((prev) => (prev === epicId ? null : epicId));
  }

  function getEpicProgress(epicId: string) {
    const children = childrenByEpicId[epicId] ?? [];
    const total = children.length;
    const done = children.filter((issue) =>
      issue.status.name.toLowerCase().includes('done')
    ).length;
    const percent = total > 0 ? (done / total) * 100 : 0;
    return { total, done, percent };
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Epics'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              {epics.length} epic{epics.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Epic
          </Button>
        </div>
      </div>

      {/* Epic List */}
      {epicsLoading ? (
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
      ) : epics.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Layers className="h-8 w-8" />}
            title="No epics yet"
            description="Create your first epic to start organizing work into larger themes."
            actionLabel="Create Epic"
            onAction={() => setShowCreateModal(true)}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {epics.map((epic) => {
            const { total, done, percent } = getEpicProgress(epic.id);
            const isExpanded = expandedEpicId === epic.id;
            const children = childrenByEpicId[epic.id] ?? [];

            return (
              <Card key={epic.id} padding="none" hoverable>
                {/* Epic header row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => toggleExpand(epic.id)}
                >
                  {/* Expand chevron */}
                  <span className="text-gray-400 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>

                  {/* Epic info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-accent-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {epic.title}
                      </span>
                    </div>

                    {epic.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {epic.description}
                      </p>
                    )}

                    {/* Progress section */}
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar
                        value={percent}
                        size="sm"
                        className="flex-1 max-w-xs"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {done} of {total} issue{total !== 1 ? 's' : ''} done
                      </span>
                    </div>
                  </div>

                  {/* Priority badge */}
                  <div className="flex-shrink-0">
                    <PriorityBadge priority={epic.priority} />
                  </div>
                </div>

                {/* Expanded child issues table */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {children.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-gray-500">
                        No issues linked to this epic.
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
                            {children.map((issue) => (
                              <tr
                                key={issue.id}
                                className="table-row cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/issues/${issue.id}`);
                                }}
                              >
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
          })}
        </div>
      )}

      {/* Create Epic Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
        title="Create Epic"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Title"
            placeholder="What is this epic about?"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Describe the scope of this epic..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Priority).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setValue('priority', priority)}
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

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Epic
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
