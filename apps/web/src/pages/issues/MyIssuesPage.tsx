import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Bug,
  ListTodo,
  BookOpen,
  Layers,
  Inbox,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth.store';
import { issueService } from '@/services/issue.service';
import { cn } from '@/utils/cn';
import { IssueType, Priority } from '@/types';
import type { Issue } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

export function MyIssuesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterType, setFilterType] = useState<IssueType | ''>('');

  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues', 'my-issues', user?.id],
    queryFn: () => issueService.list({ assignee: user!.id }),
    enabled: !!user,
  });

  const allIssues = issuesData?.data ?? [];

  // Client-side filtering for search, priority, and type
  const filteredIssues = allIssues.filter((issue: Issue) => {
    if (searchQuery && !issue.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterPriority && issue.priority !== filterPriority) {
      return false;
    }
    if (filterType && issue.type !== filterType) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">My Issues</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} assigned to you
        </p>
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
          onChange={(e) => setFilterPriority(e.target.value as Priority | '')}
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
          onChange={(e) => setFilterType(e.target.value as IssueType | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.values(IssueType).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Issues Table */}
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
            icon={<Inbox className="h-8 w-8" />}
            title={searchQuery || filterPriority || filterType ? 'No matching issues' : 'No issues assigned'}
            description={
              searchQuery || filterPriority || filterType
                ? 'Try adjusting your search or filters.'
                : 'Issues assigned to you will appear here.'
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-5 py-3 w-8" />
                  <th className="px-5 py-3">Issue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue: Issue) => (
                  <tr
                    key={issue.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
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
                    <td className="px-5 py-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-600">
                        {issue.projectId}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(issue.updatedAt), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
