import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Columns3,
  List,
  Timer,
  BarChart3,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { projectService } from '@/services/project.service';
import { issueService } from '@/services/issue.service';
import { cn } from '@/utils/cn';
import { ProjectType } from '@/types';
import type { Issue } from '@/types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.get(id!),
    enabled: !!id,
  });

  const { data: issues } = useQuery({
    queryKey: ['issues', { projectId: id }],
    queryFn: () => issueService.list({ projectId: id }),
    enabled: !!id,
  });

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses', id],
    queryFn: () => projectService.getStatuses(id!),
    enabled: !!id,
  });

  if (isLoadingProject) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <p className="text-gray-500">Project not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  const allIssues = issues?.data ?? [];
  const todoCount = allIssues.filter(
    (i: Issue) =>
      i.status.name.toLowerCase() === 'todo' ||
      i.status.name.toLowerCase() === 'open'
  ).length;
  const inProgressCount = allIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'in progress'
  ).length;
  const doneCount = allIssues.filter(
    (i: Issue) =>
      i.status.name.toLowerCase() === 'done' ||
      i.status.name.toLowerCase() === 'completed'
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back button + Header */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-50 text-primary-600 font-bold text-lg">
              {project.key}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    project.type === ProjectType.SCRUM ? 'accent' : 'primary'
                  }
                >
                  {project.type}
                </Badge>
                {project.description && (
                  <span className="text-sm text-gray-500">
                    {project.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Settings className="h-4 w-4" />}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Columns3 className="h-4 w-4" />}
          onClick={() => navigate(`/board/${project.id}`)}
        >
          Board
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<List className="h-4 w-4" />}
          onClick={() => navigate(`/backlog/${project.id}`)}
        >
          Backlog
        </Button>
        {project.type === ProjectType.SCRUM && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Timer className="h-4 w-4" />}
            onClick={() => navigate(`/sprints/${project.id}`)}
          >
            Sprints
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<BarChart3 className="h-4 w-4" />}
          onClick={() => navigate(`/reports/${project.id}`)}
        >
          Reports
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Issues"
          value={allIssues.length}
          subtitle="All issues in project"
        />
        <MetricCard
          label="To Do"
          value={todoCount}
          subtitle="Waiting to be started"
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          subtitle="Currently being worked on"
        />
        <MetricCard
          label="Completed"
          value={doneCount}
          subtitle="Done and shipped"
          trend={
            allIssues.length > 0
              ? {
                  value: Math.round((doneCount / allIssues.length) * 100),
                  direction: 'up',
                  isPositive: true,
                }
              : undefined
          }
        />
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Overall Completion</span>
              <span className="font-medium text-primary-600">
                {allIssues.length > 0
                  ? Math.round((doneCount / allIssues.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <ProgressBar
              value={doneCount}
              max={allIssues.length || 1}
              size="lg"
            />
          </div>

          {/* Status breakdown */}
          {(statuses ?? []).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {(statuses ?? []).map((status) => {
                const count = allIssues.filter(
                  (i: Issue) => i.statusId === status.id
                ).length;
                return (
                  <div
                    key={status.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">
                        {status.name}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {count}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Issues */}
      <Card padding="none">
        <div className="p-5 pb-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Issues</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/backlog/${project.id}`)}
              >
                View all
              </Button>
            </div>
          </CardHeader>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3">Issue</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {allIssues.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No issues yet. Create your first issue from the Board or
                    Backlog view.
                  </td>
                </tr>
              ) : (
                allIssues.slice(0, 10).map((issue: Issue) => (
                  <tr
                    key={issue.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
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
                      <Badge
                        variant={
                          issue.priority === 'CRITICAL' ||
                          issue.priority === 'HIGH'
                            ? 'danger'
                            : issue.priority === 'MEDIUM'
                              ? 'warning'
                              : 'primary'
                        }
                      >
                        {issue.priority}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {issue.assignee?.name ?? 'Unassigned'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
