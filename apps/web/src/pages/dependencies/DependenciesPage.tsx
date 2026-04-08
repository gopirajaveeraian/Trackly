import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Link2,
  ArrowRight,
  Ban,
  GitCompareArrows,
  Copy,
  Bug,
  ListTodo,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { issueService } from '@/services/issue.service';
import { cn } from '@/utils/cn';
import { IssueLinkType, IssueType } from '@/types';
import type { Issue, IssueLink } from '@/types';

// ---------------------------------------------------------------------------
// Link type config
// ---------------------------------------------------------------------------

type LinkTab = 'ALL' | 'BLOCKS' | 'RELATES_TO' | 'DUPLICATES';

const LINK_TABS: { key: LinkTab; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: 'All Links', icon: <Link2 className="h-4 w-4" /> },
  { key: 'BLOCKS', label: 'Blocks', icon: <Ban className="h-4 w-4" /> },
  { key: 'RELATES_TO', label: 'Relates To', icon: <GitCompareArrows className="h-4 w-4" /> },
  { key: 'DUPLICATES', label: 'Duplicates', icon: <Copy className="h-4 w-4" /> },
];

const linkTypeColors: Record<string, string> = {
  [IssueLinkType.BLOCKS]: 'text-danger-600',
  [IssueLinkType.IS_BLOCKED_BY]: 'text-danger-600',
  [IssueLinkType.RELATES_TO]: 'text-primary-500',
  [IssueLinkType.DUPLICATES]: 'text-warning-500',
};

const linkTypeLabels: Record<string, string> = {
  [IssueLinkType.BLOCKS]: 'blocks',
  [IssueLinkType.IS_BLOCKED_BY]: 'is blocked by',
  [IssueLinkType.RELATES_TO]: 'relates to',
  [IssueLinkType.DUPLICATES]: 'duplicates',
};

const linkTypeArrowColors: Record<string, string> = {
  [IssueLinkType.BLOCKS]: 'bg-danger-500',
  [IssueLinkType.IS_BLOCKED_BY]: 'bg-danger-500',
  [IssueLinkType.RELATES_TO]: 'bg-primary-500',
  [IssueLinkType.DUPLICATES]: 'bg-warning-400',
};

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

// ---------------------------------------------------------------------------
// Types for flattened link rows
// ---------------------------------------------------------------------------

interface DependencyRow {
  linkId: string;
  type: IssueLinkType;
  sourceIssue: Issue;
  targetIssue: {
    id: string;
    title: string;
    number?: number;
    type: IssueType;
    priority: string;
    status: { id: string; name: string; color: string };
    assignee: { id: string; name: string; avatar: string | null } | null;
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DependenciesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LinkTab>('ALL');

  // ---- Queries ----
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues', { projectId }],
    queryFn: () => issueService.list({ projectId }),
    enabled: !!projectId,
  });

  const allIssues = issuesData?.data ?? [];

  // Build a map of issue ID -> issue for quick lookup
  const issueMap = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of allIssues) {
      map.set(issue.id, issue);
    }
    return map;
  }, [allIssues]);

  // Flatten all links across issues into dependency rows
  const allDependencies: DependencyRow[] = useMemo(() => {
    const rows: DependencyRow[] = [];
    const seenLinkIds = new Set<string>();

    for (const issue of allIssues) {
      if (!issue.links) continue;

      for (const link of issue.links) {
        if (seenLinkIds.has(link.id)) continue;
        seenLinkIds.add(link.id);

        // Determine target issue
        const targetId = link.targetIssueId === issue.id ? link.sourceIssueId : link.targetIssueId;
        const targetIssue = issueMap.get(targetId);

        if (targetIssue) {
          rows.push({
            linkId: link.id,
            type: link.type,
            sourceIssue: issue,
            targetIssue: {
              id: targetIssue.id,
              title: targetIssue.title,
              number: targetIssue.number,
              type: targetIssue.type,
              priority: targetIssue.priority,
              status: targetIssue.status,
              assignee: targetIssue.assignee,
            },
          });
        }
      }
    }

    return rows;
  }, [allIssues, issueMap]);

  // Filter by tab
  const filteredDependencies = useMemo(() => {
    if (activeTab === 'ALL') return allDependencies;
    return allDependencies.filter((row) => {
      switch (activeTab) {
        case 'BLOCKS':
          return row.type === IssueLinkType.BLOCKS || row.type === IssueLinkType.IS_BLOCKED_BY;
        case 'RELATES_TO':
          return row.type === IssueLinkType.RELATES_TO;
        case 'DUPLICATES':
          return row.type === IssueLinkType.DUPLICATES;
        default:
          return true;
      }
    });
  }, [allDependencies, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const blockCount = allDependencies.filter(
      (d) => d.type === IssueLinkType.BLOCKS || d.type === IssueLinkType.IS_BLOCKED_BY
    ).length;
    const relatesCount = allDependencies.filter(
      (d) => d.type === IssueLinkType.RELATES_TO
    ).length;
    const dupeCount = allDependencies.filter(
      (d) => d.type === IssueLinkType.DUPLICATES
    ).length;
    return { total: allDependencies.length, blockCount, relatesCount, dupeCount };
  }, [allDependencies]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Dependencies'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              {stats.total} dependency link{stats.total !== 1 ? 's' : ''} across project issues
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total Links</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-danger-600">{stats.blockCount}</p>
            <p className="text-xs text-gray-500 mt-1">Blocking</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-primary-500">{stats.relatesCount}</p>
            <p className="text-xs text-gray-500 mt-1">Related</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-warning-500">{stats.dupeCount}</p>
            <p className="text-xs text-gray-500 mt-1">Duplicates</p>
          </Card>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="h-4 w-8 bg-gray-200 rounded" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </Card>
      ) : stats.total === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 className="h-8 w-8" />}
            title="No dependencies"
            description="Issues in this project have no linked dependencies yet. Link issues together to track dependencies."
          />
        </Card>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-gray-200">
            {LINK_TABS.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? stats.total
                  : tab.key === 'BLOCKS'
                    ? stats.blockCount
                    : tab.key === 'RELATES_TO'
                      ? stats.relatesCount
                      : stats.dupeCount;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'tab flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.key && 'tab-active'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dependency List */}
          {filteredDependencies.length === 0 ? (
            <Card>
              <div className="text-center py-10 text-sm text-gray-500">
                No links of this type found.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDependencies.map((dep) => (
                <DependencyCard
                  key={dep.linkId}
                  dependency={dep}
                  onNavigate={(issueId) => navigate(`/issues/${issueId}`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dependency Card sub-component
// ---------------------------------------------------------------------------

interface DependencyCardProps {
  dependency: DependencyRow;
  onNavigate: (issueId: string) => void;
}

function DependencyCard({ dependency, onNavigate }: DependencyCardProps) {
  const { sourceIssue, targetIssue, type } = dependency;
  const arrowColor = linkTypeArrowColors[type] ?? 'bg-gray-400';
  const labelColor = linkTypeColors[type] ?? 'text-gray-500';
  const label = linkTypeLabels[type] ?? type;

  return (
    <Card padding="none" hoverable>
      <div className="flex items-center gap-4 px-5 py-3">
        {/* Source Issue */}
        <div
          className="flex-1 min-w-0 cursor-pointer group"
          onClick={() => onNavigate(sourceIssue.id)}
        >
          <div className="flex items-center gap-2">
            {issueTypeIcons[sourceIssue.type]}
            <span className="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate transition-colors">
              {sourceIssue.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                sourceIssue.status.name.toLowerCase().includes('done')
                  ? 'success'
                  : sourceIssue.status.name.toLowerCase().includes('progress')
                    ? 'primary'
                    : 'default'
              }
            >
              {sourceIssue.status.name}
            </Badge>
            <PriorityBadge priority={sourceIssue.priority} />
            {sourceIssue.assignee && (
              <Avatar
                name={sourceIssue.assignee.name}
                src={sourceIssue.assignee.avatar}
                size="xs"
              />
            )}
          </div>
        </div>

        {/* Link Type Arrow */}
        <div className="flex flex-col items-center gap-1 px-4 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={cn('h-0.5 w-8 rounded-full', arrowColor)} />
            <ArrowRight className={cn('h-4 w-4', labelColor)} />
          </div>
          <span className={cn('text-[10px] font-medium uppercase tracking-wide', labelColor)}>
            {label}
          </span>
        </div>

        {/* Target Issue */}
        <div
          className="flex-1 min-w-0 cursor-pointer group"
          onClick={() => onNavigate(targetIssue.id)}
        >
          <div className="flex items-center gap-2">
            {issueTypeIcons[targetIssue.type]}
            <span className="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate transition-colors">
              {targetIssue.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                targetIssue.status.name.toLowerCase().includes('done')
                  ? 'success'
                  : targetIssue.status.name.toLowerCase().includes('progress')
                    ? 'primary'
                    : 'default'
              }
            >
              {targetIssue.status.name}
            </Badge>
            <Badge
              variant={
                targetIssue.priority === 'CRITICAL' || targetIssue.priority === 'HIGH'
                  ? 'danger'
                  : targetIssue.priority === 'MEDIUM'
                    ? 'warning'
                    : 'primary'
              }
            >
              {targetIssue.priority}
            </Badge>
            {targetIssue.assignee && (
              <Avatar
                name={targetIssue.assignee.name}
                src={targetIssue.assignee.avatar}
                size="xs"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
