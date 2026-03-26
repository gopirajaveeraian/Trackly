import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { PriorityBadge, IssueTypeBadge } from '@/components/ui/Badge';
import { projectService } from '@/services/project.service';
import { issueService } from '@/services/issue.service';
import { sprintService } from '@/services/sprint.service';
import { useProjectSocket } from '@/hooks/useSocket';
import { cn } from '@/utils/cn';
import { Priority, SprintStatus } from '@/types';
import type { Issue, ProjectStatus, Sprint } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Priority[] = [
  Priority.CRITICAL,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
];

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.CRITICAL]: 'Critical',
  [Priority.HIGH]: 'High',
  [Priority.MEDIUM]: 'Medium',
  [Priority.LOW]: 'Low',
};

type SwimlaneMode = 'none' | 'assignee' | 'priority';

const SPRINT_ALL = '__all__';
const SPRINT_NONE = '__none__';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface BoardColumn {
  id: string;
  name: string;
  color: string;
  order: number; // status column order
  projectId: string;
  issues: Issue[];
}

interface SortableIssueCardProps {
  issue: Issue;
  onClick: () => void;
}

function SortableIssueCard({ issue, onClick }: SortableIssueCardProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 cursor-pointer group',
        'hover:border-primary-200 hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-gray-300 hover:text-gray-500 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {issue.title}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <IssueTypeBadge type={issue.type} />
            <PriorityBadge priority={issue.priority} />
          </div>
          <div className="flex items-center justify-between mt-2">
            {issue.assignee ? (
              <Avatar
                name={issue.assignee.name}
                src={issue.assignee.avatar}
                size="xs"
              />
            ) : (
              <span className="text-[10px] text-gray-400">Unassigned</span>
            )}
            {issue.dueDate && (
              <span className="text-[10px] text-gray-400">
                {new Date(issue.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueCardOverlay({ issue }: { issue: Issue }) {
  return (
    <div className="bg-white rounded-lg border border-primary-300 shadow-lg p-3 w-72">
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {issue.title}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <IssueTypeBadge type={issue.type} />
        <PriorityBadge priority={issue.priority} />
      </div>
    </div>
  );
}

interface DroppableColumnProps {
  column: BoardColumn;
  children: React.ReactNode;
}

function DroppableColumn({ column, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 bg-gray-50/80 rounded-lg p-2 space-y-2 min-h-[200px] transition-colors',
        isOver && 'bg-primary-50/60 ring-2 ring-primary-200 ring-inset'
      )}
    >
      {children}
    </div>
  );
}

// ─── Swimlane helpers ────────────────────────────────────────────────────────

interface SwimlaneGroup {
  key: string;
  label: string;
  avatar?: { name: string; src: string | null } | null;
  issues: Issue[];
}

function groupByAssignee(issues: Issue[]): SwimlaneGroup[] {
  const map = new Map<string, SwimlaneGroup>();

  for (const issue of issues) {
    const key = issue.assigneeId ?? '__unassigned__';
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: issue.assignee?.name ?? 'Unassigned',
        avatar: issue.assignee
          ? { name: issue.assignee.name, src: issue.assignee.avatar }
          : null,
        issues: [],
      });
    }
    map.get(key)!.issues.push(issue);
  }

  // Sort: assigned users alphabetically first, then unassigned at the end
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.key === '__unassigned__') return 1;
    if (b.key === '__unassigned__') return -1;
    return a.label.localeCompare(b.label);
  });

  return groups;
}

function groupByPriority(issues: Issue[]): SwimlaneGroup[] {
  const map = new Map<Priority, Issue[]>();
  for (const p of PRIORITY_ORDER) {
    map.set(p, []);
  }
  for (const issue of issues) {
    const bucket = map.get(issue.priority);
    if (bucket) {
      bucket.push(issue);
    }
  }

  return PRIORITY_ORDER.filter((p) => map.get(p)!.length > 0).map((p) => ({
    key: p,
    label: PRIORITY_LABELS[p],
    issues: map.get(p)!,
  }));
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [localColumns, setLocalColumns] = useState<BoardColumn[] | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(SPRINT_ALL);
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');

  // Subscribe to real-time project updates via Socket.io
  useProjectSocket(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

  const { data: issues } = useQuery({
    queryKey: ['issues', { projectId }],
    queryFn: () => issueService.list({ projectId }),
    enabled: !!projectId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintService.list(projectId!),
    enabled: !!projectId,
  });

  // Auto-select the active sprint when sprints load
  useEffect(() => {
    if (sprints && selectedSprintId === SPRINT_ALL) {
      const activeSprint = sprints.find(
        (s: Sprint) => s.status === SprintStatus.ACTIVE
      );
      if (activeSprint) {
        setSelectedSprintId(activeSprint.id);
      }
    }
    // Only run when sprints data first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints]);

  const updateStatusMutation = useMutation({
    mutationFn: ({
      issueId,
      statusId,
    }: {
      issueId: string;
      statusId: string;
    }) => issueService.updateStatus(issueId, statusId),
    onMutate: async ({ issueId, statusId }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['issues', { projectId }] });

      // Snapshot the previous value
      const previousIssues = queryClient.getQueryData(['issues', { projectId }]);

      // Optimistically update the cache
      queryClient.setQueryData(
        ['issues', { projectId }],
        (old: typeof issues) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((issue: Issue) => {
              if (issue.id === issueId) {
                return {
                  ...issue,
                  statusId,
                };
              }
              return issue;
            }),
          };
        }
      );

      return { previousIssues };
    },
    onError: (_err, _variables, context) => {
      // Roll back the cache to the previous value on error
      if (context?.previousIssues) {
        queryClient.setQueryData(
          ['issues', { projectId }],
          context.previousIssues
        );
      }
    },
    onSettled: () => {
      // Refetch after error or success to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['issues', { projectId }] });
    },
  });

  // Filter issues by selected sprint
  const filteredIssues = useMemo(() => {
    const allIssues = issues?.data ?? [];
    if (selectedSprintId === SPRINT_ALL) return allIssues;
    if (selectedSprintId === SPRINT_NONE)
      return allIssues.filter((i: Issue) => i.sprintId === null);
    return allIssues.filter((i: Issue) => i.sprintId === selectedSprintId);
  }, [issues, selectedSprintId]);

  // Build columns from server data
  const serverColumns = useMemo(() => {
    const allStatuses = statuses ?? [];

    return allStatuses
      .sort((a, b) => a.order - b.order)
      .map((status: ProjectStatus) => ({
        ...status,
        issues: filteredIssues
          .filter((issue: Issue) => issue.statusId === status.id),
      }));
  }, [statuses, filteredIssues]);

  // Use local columns during drag for real-time visual feedback,
  // otherwise fall back to server-derived columns
  const columns: BoardColumn[] = localColumns ?? serverColumns;

  // Sync local state when server data changes and we're not dragging
  useEffect(() => {
    if (!activeIssue) {
      setLocalColumns(null);
    }
  }, [serverColumns, activeIssue]);

  // Total filtered issue count for subtitle
  const filteredIssueCount = filteredIssues.length;

  // Selected sprint name for subtitle
  const selectedSprintName = useMemo(() => {
    if (selectedSprintId === SPRINT_ALL || selectedSprintId === SPRINT_NONE)
      return null;
    return sprints?.find((s: Sprint) => s.id === selectedSprintId)?.name ?? null;
  }, [sprints, selectedSprintId]);

  // Helper: find which column contains a given issue or column ID
  const findColumnByItemId = useCallback(
    (id: string): BoardColumn | undefined => {
      // Check if the id is a column id
      const asColumn = columns.find((col) => col.id === id);
      if (asColumn) return asColumn;

      // Otherwise find the column containing this issue
      return columns.find((col) =>
        col.issues.some((issue) => issue.id === id)
      );
    },
    [columns]
  );

  function handleDragStart(event: DragStartEvent) {
    const allIssues = issues?.data ?? [];
    const issue = allIssues.find((i: Issue) => i.id === event.active.id);
    setActiveIssue(issue ?? null);
    // Initialize local columns from current server state when drag starts
    setLocalColumns(serverColumns.map((col) => ({ ...col, issues: [...col.issues] })));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByItemId(activeId);
    const overColumn = findColumnByItemId(overId);

    if (!activeColumn || !overColumn) return;

    // Only handle cross-column moves here; same-column reorder is handled in DragEnd
    if (activeColumn.id === overColumn.id) return;

    setLocalColumns((prev) => {
      if (!prev) return prev;

      const sourceCol = prev.find((col) => col.id === activeColumn.id);
      const destCol = prev.find((col) => col.id === overColumn.id);
      if (!sourceCol || !destCol) return prev;

      const activeIndex = sourceCol.issues.findIndex((i) => i.id === activeId);
      if (activeIndex === -1) return prev;

      const movingIssue = sourceCol.issues[activeIndex];

      // Determine insertion index in the destination column
      let overIndex: number;
      if (overId === destCol.id) {
        // Dropped on the column itself (empty area) -- put at end
        overIndex = destCol.issues.length;
      } else {
        overIndex = destCol.issues.findIndex((i) => i.id === overId);
        if (overIndex === -1) {
          overIndex = destCol.issues.length;
        }
      }

      // Build new columns array
      return prev.map((col) => {
        if (col.id === sourceCol.id) {
          return {
            ...col,
            issues: col.issues.filter((i) => i.id !== activeId),
          };
        }
        if (col.id === destCol.id) {
          const newIssues = [...col.issues];
          newIssues.splice(overIndex, 0, {
            ...movingIssue,
            statusId: destCol.id,
          });
          return { ...col, issues: newIssues };
        }
        return col;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveIssue(null);

    if (!over) {
      setLocalColumns(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByItemId(activeId);
    const overColumn = findColumnByItemId(overId);

    if (!activeColumn || !overColumn) {
      setLocalColumns(null);
      return;
    }

    // Same-column reorder — no server persistence needed without order field
    if (activeColumn.id === overColumn.id) {
      const activeIndex = activeColumn.issues.findIndex((i) => i.id === activeId);
      const overIndex = activeColumn.issues.findIndex((i) => i.id === overId);

      if (activeIndex !== overIndex && overIndex !== -1) {
        const reordered = arrayMove(activeColumn.issues, activeIndex, overIndex);

        // Update local state for visual feedback (reorder is client-side only)
        setLocalColumns((prev) => {
          if (!prev) return prev;
          return prev.map((col) => {
            if (col.id === activeColumn.id) {
              return { ...col, issues: reordered };
            }
            return col;
          });
        });
      } else {
        setLocalColumns(null);
      }
    } else {
      // Cross-column move: persist the status change to the server
      updateStatusMutation.mutate({
        issueId: activeId,
        statusId: overColumn.id,
      });
    }

    // Clear local columns -- let optimistic cache update take over
    setLocalColumns(null);
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function renderSwimlaneIssues(columnIssues: Issue[]) {
    if (swimlaneMode === 'none') {
      return columnIssues.map((issue: Issue) => (
        <SortableIssueCard
          key={issue.id}
          issue={issue}
          onClick={() => navigate(`/issues/${issue.id}`)}
        />
      ));
    }

    const groups =
      swimlaneMode === 'assignee'
        ? groupByAssignee(columnIssues)
        : groupByPriority(columnIssues);

    if (groups.length === 0) return null;

    return groups.map((group) => (
      <div key={group.key}>
        {/* Swimlane divider */}
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 py-1.5 flex items-center gap-2">
          {swimlaneMode === 'assignee' && group.avatar && (
            <Avatar
              name={group.avatar.name}
              src={group.avatar.src}
              size="xs"
            />
          )}
          <span>{group.label}</span>
          <span className="text-gray-400 font-normal normal-case">
            ({group.issues.length})
          </span>
        </div>
        {group.issues.map((issue: Issue) => (
          <SortableIssueCard
            key={issue.id}
            issue={issue}
            onClick={() => navigate(`/issues/${issue.id}`)}
          />
        ))}
      </div>
    ));
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {project?.name ?? 'Board'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedSprintName
              ? `${selectedSprintName} \u00b7 ${filteredIssueCount} issue${filteredIssueCount !== 1 ? 's' : ''}`
              : 'Drag and drop issues between columns'}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate(`/backlog/${projectId}`)}
        >
          Create Issue
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Sprint filter */}
        <select
          value={selectedSprintId}
          onChange={(e) => setSelectedSprintId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
        >
          <option value={SPRINT_ALL}>All Issues</option>
          {sprints?.map((sprint: Sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name}
              {sprint.status === SprintStatus.ACTIVE ? ' (Active)' : ''}
            </option>
          ))}
          <option value={SPRINT_NONE}>No Sprint</option>
        </select>

        {/* Swimlane toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          {(
            [
              { value: 'none', label: 'None' },
              { value: 'assignee', label: 'Assignee' },
              { value: 'priority', label: 'Priority' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSwimlaneMode(value)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                swimlaneMode === value
                  ? 'bg-primary-50 text-primary-600 border-primary-200'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {column.name}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {column.issues.length}
                  </span>
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Column Body -- wrapped with useDroppable */}
              <DroppableColumn column={column}>
                <SortableContext
                  items={column.issues.map((i: Issue) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderSwimlaneIssues(column.issues)}
                </SortableContext>

                {column.issues.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-gray-400">
                    Drop issues here
                  </div>
                )}
              </DroppableColumn>
            </div>
          ))}

          {columns.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-8 text-center">
                <p className="text-gray-500 text-sm">
                  No statuses configured for this project.
                </p>
              </Card>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeIssue && <IssueCardOverlay issue={activeIssue} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
