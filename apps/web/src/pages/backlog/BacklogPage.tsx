import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Bug,
  ListTodo,
  BookOpen,
  Layers,
  X,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, PriorityBadge, IssueTypeBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { issueService } from '@/services/issue.service';
import { sprintService } from '@/services/sprint.service';
import { useProjectSocket } from '@/hooks/useSocket';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { cn } from '@/utils/cn';
import { IssueType, Priority, SprintStatus } from '@/types';
import type { Issue, CreateIssueRequest, ProjectStatus, Sprint, PaginatedResponse } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType),
  priority: z.nativeEnum(Priority),
  statusId: z.string().min(1, 'Status is required'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateIssueFormValues = z.infer<typeof createIssueSchema>;

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

// --- Sprint Cell Dropdown Component ---

function SprintCellDropdown({
  issue,
  sprints,
  sprintMap,
  onAssign,
}: {
  issue: Issue;
  sprints: Sprint[];
  sprintMap: Map<string, Sprint>;
  onAssign: (issueId: string, sprintId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentSprint = issue.sprintId ? sprintMap.get(issue.sprintId) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          'inline-flex items-center gap-1 text-sm rounded-md px-2 py-1 transition-colors',
          currentSprint
            ? 'text-gray-700 hover:bg-gray-100'
            : 'text-gray-400 hover:bg-gray-100'
        )}
      >
        <span className="truncate max-w-[120px]">
          {currentSprint ? currentSprint.name : 'No Sprint'}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign(issue.id, null);
              setOpen(false);
            }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors',
              !issue.sprintId
                ? 'text-primary-600 font-medium bg-primary-50/50'
                : 'text-gray-600'
            )}
          >
            No Sprint
          </button>
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssign(issue.id, sprint.id);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors',
                issue.sprintId === sprint.id
                  ? 'text-primary-600 font-medium bg-primary-50/50'
                  : 'text-gray-700'
              )}
            >
              <span className="truncate block">{sprint.name}</span>
              <span className="text-xs text-gray-400">
                {sprint.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sortable Row Component ---

interface SortableRowProps {
  issue: Issue;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onNavigate: (id: string) => void;
  sprints: Sprint[];
  sprintMap: Map<string, Sprint>;
  onAssignSprint: (issueId: string, sprintId: string | null) => void;
}

function SortableRow({
  issue,
  isSelected,
  onToggleSelect,
  onNavigate,
  sprints,
  sprintMap,
  onAssignSprint,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'table-row cursor-pointer',
        isSelected && 'bg-primary-50/40',
        isDragging && 'opacity-50 bg-gray-50'
      )}
      onClick={() => onNavigate(issue.id)}
    >
      <td className="px-2 py-3 w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(issue.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>
      <td className="px-5 py-3">
        {issueTypeIcons[issue.type]}
      </td>
      <td className="px-5 py-3">
        <span className="text-sm font-medium text-gray-900">
          {issue.title}
        </span>
      </td>
      <td className="px-5 py-3">
        <Badge
          variant={
            issue.status.name
              .toLowerCase()
              .includes('done')
              ? 'success'
              : issue.status.name
                    .toLowerCase()
                    .includes('progress')
                ? 'primary'
                : 'default'
          }
        >
          {issue.status.name}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <PriorityBadge priority={issue.priority} />
      </td>
      <td className="px-5 py-3">
        <SprintCellDropdown
          issue={issue}
          sprints={sprints}
          sprintMap={sprintMap}
          onAssign={onAssignSprint}
        />
      </td>
      <td className="px-5 py-3">
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
      <td className="px-5 py-3 text-xs text-gray-500">
        {formatDistanceToNow(
          new Date(issue.updatedAt),
          {
            addSuffix: true,
          }
        )}
      </td>
    </tr>
  );
}

// --- Main Page Component ---

export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterType, setFilterType] = useState<IssueType | ''>('');
  const [filterSprint, setFilterSprint] = useState<string>(''); // '' = all, 'none' = no sprint, or sprint id
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(
    new Set()
  );

  // Subscribe to real-time project updates via Socket.io
  useProjectSocket(projectId);

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

  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', { projectId }],
    queryFn: () => issueService.list({ projectId }),
    enabled: !!projectId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintService.list(projectId!),
    enabled: !!projectId,
  });

  const sprintMap = useMemo(() => {
    const map = new Map<string, Sprint>();
    if (sprints) {
      for (const sprint of sprints) {
        map.set(sprint.id, sprint);
      }
    }
    return map;
  }, [sprints]);

  const createMutation = useMutation({
    mutationFn: (data: CreateIssueRequest) => issueService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
      setShowCreateModal(false);
      reset();
      setDescription('');
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { sprintId: string | null };
    }) => issueService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
    },
  });

  const bulkMoveToSprintMutation = useMutation({
    mutationFn: async (sprintId: string | null) => {
      const promises = Array.from(selectedIssueIds).map((issueId) =>
        issueService.update(issueId, { sprintId })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
      setSelectedIssueIds(new Set());
    },
  });

  // ─── Drag-to-Reorder ───────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = useMutation({
    mutationFn: ({
      id,
      previousOrder,
      nextOrder,
    }: {
      id: string;
      previousOrder: number | null;
      nextOrder: number | null;
    }) => issueService.reorder(id, previousOrder, nextOrder),
    onMutate: async ({ id, previousOrder, nextOrder }) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['issues', { projectId }] });

      const previousData = queryClient.getQueryData<PaginatedResponse<Issue>>([
        'issues',
        { projectId },
      ]);

      if (previousData) {
        const newOrder =
          previousOrder === null && nextOrder !== null
            ? nextOrder - 1
            : nextOrder === null && previousOrder !== null
              ? previousOrder + 1
              : previousOrder !== null && nextOrder !== null
                ? (previousOrder + nextOrder) / 2
                : 0;

        const updatedData = previousData.data.map((issue) =>
          issue.id === id ? { ...issue, order: newOrder } : issue
        );
        updatedData.sort((a, b) => a.order - b.order);

        queryClient.setQueryData<PaginatedResponse<Issue>>(
          ['issues', { projectId }],
          { ...previousData, data: updatedData }
        );
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Roll back to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['issues', { projectId }],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateIssueFormValues>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      title: '',
      description: '',
      type: IssueType.TASK,
      priority: Priority.MEDIUM,
      statusId: '',
    },
  });

  const selectedType = watch('type');
  const selectedPriority = watch('priority');

  function onSubmit(data: CreateIssueFormValues) {
    if (!projectId) return;
    createMutation.mutate({
      ...data,
      description,
      projectId,
    });
  }

  // Filter and sort issues by order
  const allIssues = issues?.data ?? [];
  const filteredIssues = allIssues
    .filter((issue: Issue) => {
      if (
        searchQuery &&
        !issue.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterPriority && issue.priority !== filterPriority) {
        return false;
      }
      if (filterType && issue.type !== filterType) {
        return false;
      }
      if (filterSprint === 'none' && issue.sprintId !== null) {
        return false;
      }
      if (
        filterSprint !== '' &&
        filterSprint !== 'none' &&
        issue.sprintId !== filterSprint
      ) {
        return false;
      }
      return true;
    })
    .sort((a: Issue, b: Issue) => a.order - b.order);

  const issueIds = useMemo(
    () => filteredIssues.map((issue: Issue) => issue.id),
    [filteredIssues]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = filteredIssues.findIndex(
        (issue: Issue) => issue.id === active.id
      );
      const newIndex = filteredIssues.findIndex(
        (issue: Issue) => issue.id === over.id
      );
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(filteredIssues, oldIndex, newIndex);
      const previousOrder =
        newIndex > 0 ? reordered[newIndex - 1].order : null;
      const nextOrder =
        newIndex < reordered.length - 1
          ? reordered[newIndex + 1].order
          : null;

      reorderMutation.mutate({
        id: active.id as string,
        previousOrder,
        nextOrder,
      });
    },
    [filteredIssues, reorderMutation]
  );

  const defaultStatusId =
    (statuses ?? []).length > 0 ? statuses![0].id : '';

  // Selection helpers
  const allFilteredSelected =
    filteredIssues.length > 0 &&
    filteredIssues.every((issue: Issue) => selectedIssueIds.has(issue.id));
  const someFilteredSelected =
    filteredIssues.some((issue: Issue) => selectedIssueIds.has(issue.id)) &&
    !allFilteredSelected;

  const handleSelectAll = useCallback(() => {
    setSelectedIssueIds((prev) => {
      if (allFilteredSelected) {
        // Deselect all filtered
        const next = new Set(prev);
        for (const issue of filteredIssues) {
          next.delete(issue.id);
        }
        return next;
      } else {
        // Select all filtered
        const next = new Set(prev);
        for (const issue of filteredIssues) {
          next.add(issue.id);
        }
        return next;
      }
    });
  }, [allFilteredSelected, filteredIssues]);

  const handleToggleSelect = useCallback(
    (issueId: string) => {
      setSelectedIssueIds((prev) => {
        const next = new Set(prev);
        if (next.has(issueId)) {
          next.delete(issueId);
        } else {
          next.add(issueId);
        }
        return next;
      });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIssueIds(new Set());
  }, []);

  const handleAssignSprint = useCallback(
    (issueId: string, sprintId: string | null) => {
      updateIssueMutation.mutate({ id: issueId, data: { sprintId } });
    },
    [updateIssueMutation]
  );

  const handleBulkMoveSprint = useCallback(
    (sprintId: string | null) => {
      bulkMoveToSprintMutation.mutate(sprintId);
    },
    [bulkMoveToSprintMutation]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {project?.name ?? 'Backlog'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredIssues.length} issue
            {filteredIssues.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            if (defaultStatusId) {
              setValue('statusId', defaultStatusId);
            }
            setShowCreateModal(true);
          }}
        >
          Create Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder-gray-400 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) =>
            setFilterPriority(e.target.value as Priority | '')
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {Object.values(Priority).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as IssueType | '')
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.values(IssueType).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterSprint}
          onChange={(e) => setFilterSprint(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
        >
          <option value="">All Sprints</option>
          <option value="none">No Sprint</option>
          {(sprints ?? []).map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIssueIds.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2.5 flex items-center gap-4">
          <span className="text-sm font-medium text-primary-700">
            {selectedIssueIds.size} selected
          </span>

          <select
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') return;
              handleBulkMoveSprint(val === '__remove__' ? null : val);
              e.target.value = '';
            }}
            className="text-sm border border-primary-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
          >
            <option value="" disabled>
              Move to Sprint...
            </option>
            <option value="__remove__">Remove from Sprint</option>
            {(sprints ?? []).map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleClearSelection}
            className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Issues List */}
      {isLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredIssues.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListTodo className="h-8 w-8" />}
            title={searchQuery ? 'No matching issues' : 'No issues yet'}
            description={
              searchQuery
                ? 'Try adjusting your search or filters.'
                : 'Create your first issue to start tracking work.'
            }
            actionLabel={searchQuery ? undefined : 'Create Issue'}
            onAction={
              searchQuery
                ? undefined
                : () => {
                    if (defaultStatusId) {
                      setValue('statusId', defaultStatusId);
                    }
                    setShowCreateModal(true);
                  }
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-2 py-3 w-8" />
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someFilteredSelected;
                          }
                        }}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-5 py-3 w-8" />
                    <th className="px-5 py-3">Issue</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Sprint</th>
                    <th className="px-5 py-3">Assignee</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <SortableContext
                  items={issueIds}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {filteredIssues.map((issue: Issue) => (
                      <SortableRow
                        key={issue.id}
                        issue={issue}
                        isSelected={selectedIssueIds.has(issue.id)}
                        onToggleSelect={handleToggleSelect}
                        onNavigate={(id) => navigate(`/issues/${id}`)}
                        sprints={sprints ?? []}
                        sprintMap={sprintMap}
                        onAssignSprint={handleAssignSprint}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </DndContext>
        </Card>
      )}

      {/* Create Issue Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
          setDescription('');
        }}
        title="Create Issue"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Title"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Add more details..."
              minHeight="100px"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Issue Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.values(IssueType).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('type', type)}
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

            {/* Priority */}
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
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              {...register('statusId')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="">Select status</option>
              {(statuses ?? []).map((status: ProjectStatus) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
            {errors.statusId && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.statusId.message}
              </p>
            )}
          </div>

          {/* Due Date */}
          <Input
            label="Due Date (optional)"
            type="date"
            {...register('dueDate')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                reset();
                setDescription('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Issue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
