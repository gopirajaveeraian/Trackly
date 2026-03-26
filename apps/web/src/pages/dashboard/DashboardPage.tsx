import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FolderKanban,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  Bug,
  ListTodo,
  BookOpen,
  Layers,
  Columns3,
  List,
  Calendar,
  UserPlus,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, PriorityBadge, IssueTypeBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { issueService } from '@/services/issue.service';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import { workspaceService } from '@/services/workspace.service';
import { cn } from '@/utils/cn';
import { formatDistanceToNow, format } from 'date-fns';
import { IssueType, Priority, ProjectType, SprintStatus } from '@/types';
import type {
  Issue,
  Project,
  Sprint,
  ProjectStatus,
  WorkspaceMember,
  CreateProjectRequest,
  CreateIssueRequest,
} from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(5, 'Key must be at most 5 characters')
    .regex(/^[A-Z]+$/, 'Key must be uppercase letters only'),
  description: z.string().optional(),
  type: z.nativeEnum(ProjectType),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType),
  priority: z.nativeEnum(Priority),
  projectId: z.string().min(1, 'Project is required'),
  statusId: z.string().min(1, 'Status is required'),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateIssueFormValues = z.infer<typeof createIssueSchema>;

// ─── Constants ────────────────────────────────────────────────────────────

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

// ─── Main Component ───────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [issueDefaultType, setIssueDefaultType] = useState<IssueType>(IssueType.TASK);

  // ─── Data Queries ─────────────────────────────────────────────────────

  const { data: projects } = useQuery({
    queryKey: ['projects', currentWorkspace?.id],
    queryFn: () =>
      currentWorkspace
        ? projectService.list(currentWorkspace.id)
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 10, hasMore: false }),
    enabled: !!currentWorkspace,
  });

  const { data: myIssues } = useQuery({
    queryKey: ['issues', 'assigned', user?.id],
    queryFn: () => issueService.list({ assignee: user?.id }),
    enabled: !!user,
  });

  const { data: allProjectIssues } = useQuery({
    queryKey: ['issues', 'all-projects', currentWorkspace?.id],
    queryFn: () => issueService.list({}),
    enabled: !!currentWorkspace,
  });

  const { data: members } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: () => workspaceService.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace,
  });

  // ─── Derived Data ─────────────────────────────────────────────────────

  const projectList = projects?.data ?? [];
  const allIssues = myIssues?.data ?? [];
  const totalProjectIssues = allProjectIssues?.data ?? [];
  const totalProjects = projects?.total ?? 0;

  const openIssues = allIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'to do' || i.status.name.toLowerCase() === 'open'
  ).length;
  const inProgressIssues = allIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'in progress'
  ).length;
  const completedIssues = allIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'done' || i.status.name.toLowerCase() === 'completed'
  ).length;
  const inReviewIssues = allIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'in review'
  ).length;

  // Overall workspace stats
  const totalDone = totalProjectIssues.filter(
    (i: Issue) => i.status.name.toLowerCase() === 'done'
  ).length;
  const totalOpen = totalProjectIssues.length - totalDone;

  // ─── Quick Create Handlers ────────────────────────────────────────────

  function openCreateIssue(type: IssueType = IssueType.TASK) {
    setIssueDefaultType(type);
    setShowCreateIssue(true);
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name?.split(' ')[0] ?? 'User'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              leftIcon={<FolderKanban className="h-4 w-4" />}
              onClick={() => setShowCreateProject(true)}
            >
              New Project
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => openCreateIssue(IssueType.TASK)}
            >
              New Issue
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              leftIcon={<Bug className="h-4 w-4" />}
              onClick={() => openCreateIssue(IssueType.BUG)}
            >
              Report Bug
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Projects"
          value={totalProjects}
          icon={<FolderKanban className="h-5 w-5" />}
          subtitle={`${totalProjectIssues.length} total issues`}
        />
        <MetricCard
          label="Open / To Do"
          value={openIssues}
          icon={<AlertCircle className="h-5 w-5" />}
          subtitle="Assigned to you"
          trend={openIssues > 0 ? { value: openIssues, direction: 'up', isPositive: false } : undefined}
        />
        <MetricCard
          label="In Progress"
          value={inProgressIssues}
          icon={<Clock className="h-5 w-5" />}
          subtitle="Currently working on"
        />
        <MetricCard
          label="In Review"
          value={inReviewIssues}
          icon={<Zap className="h-5 w-5" />}
          subtitle="Awaiting review"
        />
        <MetricCard
          label="Completed"
          value={completedIssues}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtitle="Your done items"
          trend={completedIssues > 0 ? { value: completedIssues, direction: 'up', isPositive: true } : undefined}
        />
      </div>

      {/* Quick Create Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'New Project', icon: FolderKanban, color: 'bg-indigo-50 text-indigo-600', action: () => setShowCreateProject(true) },
          { label: 'New Task', icon: ListTodo, color: 'bg-blue-50 text-blue-600', action: () => openCreateIssue(IssueType.TASK) },
          { label: 'New Story', icon: BookOpen, color: 'bg-green-50 text-green-600', action: () => openCreateIssue(IssueType.STORY) },
          { label: 'Report Bug', icon: Bug, color: 'bg-red-50 text-red-600', action: () => openCreateIssue(IssueType.BUG) },
          { label: 'New Epic', icon: Layers, color: 'bg-purple-50 text-purple-600', action: () => openCreateIssue(IssueType.EPIC) },
          { label: 'Invite Member', icon: UserPlus, color: 'bg-amber-50 text-amber-600', action: () => navigate('/settings') },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all group"
          >
            <div className={cn('flex items-center justify-center h-10 w-10 rounded-xl', item.color, 'group-hover:scale-110 transition-transform')}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Issues — Full Table */}
        <Card padding="none" className="lg:col-span-2">
          <div className="p-5 pb-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Issues ({allIssues.length})</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/my-issues')}
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
                  <th className="px-4 py-2.5 text-left text-xs">Key</th>
                  <th className="px-4 py-2.5 text-left text-xs">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs">Assignee</th>
                  <th className="px-4 py-2.5 text-left text-xs">Due Date</th>
                  <th className="px-4 py-2.5 text-left text-xs">Updated</th>
                </tr>
              </thead>
              <tbody>
                {allIssues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-500">
                      No issues assigned to you yet.{' '}
                      <button
                        onClick={() => openCreateIssue(IssueType.TASK)}
                        className="text-primary-600 hover:underline font-medium"
                      >
                        Create one
                      </button>
                    </td>
                  </tr>
                ) : (
                  allIssues.slice(0, 10).map((issue: Issue) => (
                    <tr
                      key={issue.id}
                      className="table-row cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/issues/${issue.id}`)}
                    >
                      {/* Key */}
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono text-gray-500">
                          {issue.project?.key ?? '—'}-{issue.number}
                        </span>
                      </td>
                      {/* Title with type icon */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 max-w-[280px]">
                          {issueTypeIcons[issue.type as IssueType] ?? issueTypeIcons[IssueType.TASK]}
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {issue.title}
                          </span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            issue.status.name.toLowerCase().includes('done')
                              ? 'success'
                              : issue.status.name.toLowerCase().includes('progress')
                                ? 'primary'
                                : issue.status.name.toLowerCase().includes('review')
                                  ? 'warning'
                                  : 'default'
                          }
                        >
                          {issue.status.name}
                        </Badge>
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-2.5">
                        <PriorityBadge priority={issue.priority} />
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2.5">
                        <IssueTypeBadge type={issue.type as IssueType} />
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-2.5">
                        {issue.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={issue.assignee.name} src={issue.assignee.avatar} size="xs" />
                            <span className="text-xs text-gray-600 truncate max-w-[80px]">
                              {issue.assignee.name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Due Date */}
                      <td className="px-4 py-2.5">
                        {issue.dueDate ? (
                          <span className={cn(
                            'text-xs',
                            new Date(issue.dueDate) < new Date() ? 'text-danger-600 font-medium' : 'text-gray-500'
                          )}>
                            {format(new Date(issue.dueDate), 'MMM d')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Updated */}
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Projects Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <div className="mt-4 space-y-3">
              {projectList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">No projects yet.</p>
                  <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreateProject(true)}>
                    Create Project
                  </Button>
                </div>
              ) : (
                projectList.slice(0, 5).map((project: Project) => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary-50 text-primary-600 font-bold text-xs">
                        {project.key}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          {project.type} &middot; {(project as Project & { _count?: { issues?: number; sprints?: number } })._count?.issues ?? '—'} issues
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/board/${project.id}`); }}
                        className="p-1 rounded hover:bg-primary-100 text-gray-400 hover:text-primary-600"
                        title="Board"
                      >
                        <Columns3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/backlog/${project.id}`); }}
                        className="p-1 rounded hover:bg-primary-100 text-gray-400 hover:text-primary-600"
                        title="Backlog"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/reports/${project.id}`); }}
                        className="p-1 rounded hover:bg-primary-100 text-gray-400 hover:text-primary-600"
                        title="Reports"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Workspace Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Overview</CardTitle>
            </CardHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Issues</span>
                <span className="text-sm font-semibold text-gray-900">{totalProjectIssues.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-sm font-semibold text-amber-600">{totalOpen}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-semibold text-green-600">{totalDone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Team Members</span>
                <span className="text-sm font-semibold text-gray-900">{members?.length ?? 0}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Overall Progress</span>
                  <span className="text-xs font-medium text-primary-600">
                    {totalProjectIssues.length > 0 ? Math.round((totalDone / totalProjectIssues.length) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar value={totalDone} max={totalProjectIssues.length || 1} size="md" />
              </div>
            </div>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team ({members?.length ?? 0})</CardTitle>
            </CardHeader>
            <div className="mt-4 flex flex-wrap gap-2">
              {(members ?? []).filter((m: WorkspaceMember) => m.user).slice(0, 12).map((m: WorkspaceMember) => (
                <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50" title={m.user!.name}>
                  <Avatar name={m.user!.name} src={m.user!.avatar} size="xs" />
                  <span className="text-xs text-gray-700">{m.user!.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Across All Projects — condensed row */}
      {totalProjectIssues.length > 0 && (
        <Card padding="none">
          <div className="p-5 pb-0">
            <CardHeader>
              <CardTitle>Recent Issues Across All Projects</CardTitle>
            </CardHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-2.5 text-left text-xs">Key</th>
                  <th className="px-4 py-2.5 text-left text-xs">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs">Assignee</th>
                  <th className="px-4 py-2.5 text-left text-xs">Reporter</th>
                  <th className="px-4 py-2.5 text-left text-xs">Updated</th>
                </tr>
              </thead>
              <tbody>
                {totalProjectIssues.slice(0, 8).map((issue: Issue) => (
                  <tr
                    key={issue.id}
                    className="table-row cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono text-gray-500">
                        {issue.project?.key ?? '—'}-{issue.number}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 max-w-[240px]">
                        {issueTypeIcons[issue.type as IssueType] ?? issueTypeIcons[IssueType.TASK]}
                        <span className="text-sm font-medium text-gray-900 truncate">{issue.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-medium">
                        {issue.project?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          issue.status.name.toLowerCase().includes('done') ? 'success'
                            : issue.status.name.toLowerCase().includes('progress') ? 'primary'
                              : issue.status.name.toLowerCase().includes('review') ? 'warning'
                                : 'default'
                        }
                      >
                        {issue.status.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5"><PriorityBadge priority={issue.priority} /></td>
                    <td className="px-4 py-2.5"><IssueTypeBadge type={issue.type as IssueType} /></td>
                    <td className="px-4 py-2.5">
                      {issue.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={issue.assignee.name} src={issue.assignee.avatar} size="xs" />
                          <span className="text-xs text-gray-600 truncate max-w-[70px]">{issue.assignee.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {issue.reporter ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={issue.reporter.name} src={issue.reporter.avatar} size="xs" />
                          <span className="text-xs text-gray-600 truncate max-w-[70px]">{issue.reporter.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══ Create Project Modal ═══ */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        workspaceId={currentWorkspace?.id}
      />

      {/* ═══ Create Issue Modal ═══ */}
      <CreateIssueModal
        isOpen={showCreateIssue}
        onClose={() => setShowCreateIssue(false)}
        defaultType={issueDefaultType}
        projects={projectList}
        members={members ?? []}
      />
    </div>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────

function CreateProjectModal({
  isOpen,
  onClose,
  workspaceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => projectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', key: '', description: '', type: ProjectType.SCRUM },
  });

  const selectedType = watch('type');

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    register('name').onChange(e);
    const key = e.target.value
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 4);
    if (key) setValue('key', key);
  }

  function onSubmit(data: CreateProjectFormValues) {
    if (!workspaceId) return;
    createMutation.mutate({ ...data, workspaceId });
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Create New Project" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Project Name"
          placeholder="My Awesome Project"
          error={errors.name?.message}
          {...register('name')}
          onChange={handleNameChange}
        />
        <Input
          label="Project Key"
          placeholder="MAP"
          helperText="A short identifier for issues (e.g., MAP-123)"
          error={errors.key?.message}
          {...register('key')}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('type', ProjectType.KANBAN)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-colors',
                selectedType === ProjectType.KANBAN ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Columns3 className={cn('h-5 w-5 mb-2', selectedType === ProjectType.KANBAN ? 'text-primary-600' : 'text-gray-400')} />
              <p className="text-sm font-medium text-gray-900">Kanban</p>
              <p className="text-xs text-gray-500 mt-0.5">Continuous flow with columns</p>
            </button>
            <button
              type="button"
              onClick={() => setValue('type', ProjectType.SCRUM)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-colors',
                selectedType === ProjectType.SCRUM ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <List className={cn('h-5 w-5 mb-2', selectedType === ProjectType.SCRUM ? 'text-primary-600' : 'text-gray-400')} />
              <p className="text-sm font-medium text-gray-900">Scrum</p>
              <p className="text-xs text-gray-500 mt-0.5">Sprint-based development</p>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
          <textarea
            {...register('description')}
            placeholder="Describe what this project is about..."
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Create Issue Modal ───────────────────────────────────────────────────

function CreateIssueModal({
  isOpen,
  onClose,
  defaultType,
  projects,
  members,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultType: IssueType;
  projects: Project[];
  members: WorkspaceMember[];
}) {
  const queryClient = useQueryClient();

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
      type: defaultType,
      priority: Priority.MEDIUM,
      projectId: projects[0]?.id ?? '',
      statusId: '',
      assigneeId: '',
      sprintId: '',
      dueDate: '',
    },
  });

  // Reset defaults when modal opens with new type
  const selectedProjectId = watch('projectId');
  const selectedType = watch('type');
  const selectedPriority = watch('priority');

  // When modal opens, reset form with correct defaults
  useMemo(() => {
    if (isOpen) {
      reset({
        title: '',
        description: '',
        type: defaultType,
        priority: Priority.MEDIUM,
        projectId: projects[0]?.id ?? '',
        statusId: '',
        assigneeId: '',
        sprintId: '',
        dueDate: '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultType]);

  // Fetch statuses for selected project
  const { data: statuses } = useQuery({
    queryKey: ['project-statuses', selectedProjectId],
    queryFn: () => projectService.getStatuses(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  // Fetch sprints for selected project
  const { data: sprints } = useQuery({
    queryKey: ['sprints', selectedProjectId],
    queryFn: () => sprintService.list(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  // Auto-set first status when statuses load
  useMemo(() => {
    if (statuses && statuses.length > 0 && !watch('statusId')) {
      setValue('statusId', statuses[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  const createMutation = useMutation({
    mutationFn: (data: CreateIssueRequest) => issueService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      onClose();
      reset();
    },
  });

  function onSubmit(data: CreateIssueFormValues) {
    const payload: CreateIssueRequest = {
      title: data.title,
      description: data.description,
      type: data.type as IssueType,
      priority: data.priority as Priority,
      projectId: data.projectId,
      statusId: data.statusId,
      assigneeId: data.assigneeId || undefined,
      sprintId: data.sprintId || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    };
    createMutation.mutate(payload);
  }

  const activeSprints = (sprints ?? []).filter((s: Sprint) => s.status !== 'COMPLETED');

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title={`Create ${defaultType === IssueType.BUG ? 'Bug Report' : 'Issue'}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Project Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
          <select
            {...register('projectId')}
            className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          >
            {projects.map((p: Project) => (
              <option key={p.id} value={p.id}>{p.key} — {p.name}</option>
            ))}
          </select>
          {errors.projectId && <p className="mt-1 text-xs text-danger-600">{errors.projectId.message}</p>}
        </div>

        <Input
          label="Title"
          placeholder={defaultType === IssueType.BUG ? "Describe the bug..." : "What needs to be done?"}
          error={errors.title?.message}
          {...register('title')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
          <textarea
            {...register('description')}
            placeholder={defaultType === IssueType.BUG ? "Steps to reproduce, expected vs actual behavior..." : "Add more details..."}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(IssueType).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('type', type)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(Priority).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setValue('priority', priority)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
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
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              {...register('statusId')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="">Select status</option>
              {(statuses ?? []).map((status: ProjectStatus) => (
                <option key={status.id} value={status.id}>{status.name}</option>
              ))}
            </select>
            {errors.statusId && <p className="mt-1 text-xs text-danger-600">{errors.statusId.message}</p>}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
            <select
              {...register('assigneeId')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.filter((m: WorkspaceMember) => m.user).map((m: WorkspaceMember) => (
                <option key={m.user!.id} value={m.user!.id}>{m.user!.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sprint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
            <select
              {...register('sprintId')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="">Backlog (no sprint)</option>
              {activeSprints.map((s: Sprint) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'ACTIVE' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            {...register('dueDate')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            {defaultType === IssueType.BUG ? 'Report Bug' : 'Create Issue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
