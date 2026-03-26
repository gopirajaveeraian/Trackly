import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingDown,
  Zap,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import {
  reportService,
  type BurndownResponse,
  type VelocityEntry,
  type WorkloadEntry,
  type StatusSummaryEntry,
} from '@/services/report.service';
import { SprintStatus } from '@/types';
import type { Sprint } from '@/types';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type ReportTab = 'status' | 'burndown' | 'velocity' | 'workload';

const TABS: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'status', label: 'Status Summary', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'burndown', label: 'Sprint Burndown', icon: <TrendingDown className="h-4 w-4" /> },
  { key: 'velocity', label: 'Velocity', icon: <Zap className="h-4 w-4" /> },
  { key: 'workload', label: 'Team Workload', icon: <Users className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<ReportTab>('status');
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // ---- Queries ----

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintService.list(projectId!),
    enabled: !!projectId,
  });

  // Status summary from backend
  const { data: statusSummary, isLoading: statusLoading } = useQuery({
    queryKey: ['report-status-summary', projectId],
    queryFn: () => reportService.getStatusSummary(projectId!),
    enabled: !!projectId && activeTab === 'status',
  });

  // Burndown from backend
  const activeSprint = useMemo(
    () => sprints?.find((s) => s.status === SprintStatus.ACTIVE) ?? null,
    [sprints],
  );

  const burndownSprintId = selectedSprintId ?? activeSprint?.id ?? null;

  const { data: burndownData, isLoading: burndownLoading } = useQuery({
    queryKey: ['report-burndown', burndownSprintId],
    queryFn: () => reportService.getBurndown(burndownSprintId!),
    enabled: !!burndownSprintId && activeTab === 'burndown',
  });

  // Velocity from backend
  const { data: velocityData, isLoading: velocityLoading } = useQuery({
    queryKey: ['report-velocity', projectId],
    queryFn: () => reportService.getVelocity(projectId!),
    enabled: !!projectId && activeTab === 'velocity',
  });

  // Workload from backend
  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['report-workload', projectId],
    queryFn: () => reportService.getWorkload(projectId!),
    enabled: !!projectId && activeTab === 'workload',
  });

  // ---- Loading ----

  const isLoading = sprintsLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="gradient-header rounded-xl p-6 text-white animate-pulse">
          <div className="h-7 w-48 bg-white/20 rounded" />
          <div className="h-4 w-32 bg-white/10 rounded mt-2" />
        </div>
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Gradient header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">{project?.name ?? 'Project'}</h1>
        <p className="text-white/80 mt-1 text-sm">Reports &amp; Analytics</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'tab flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key && 'tab-active',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'status' && (
        <StatusSummaryTab
          data={statusSummary ?? []}
          isLoading={statusLoading}
        />
      )}

      {activeTab === 'burndown' && (
        <BurndownTab
          sprints={sprints ?? []}
          burndownData={burndownData ?? null}
          selectedSprintId={burndownSprintId}
          onSelectSprint={setSelectedSprintId}
          isLoading={burndownLoading}
        />
      )}

      {activeTab === 'velocity' && (
        <VelocityTab data={velocityData ?? []} isLoading={velocityLoading} />
      )}

      {activeTab === 'workload' && (
        <WorkloadTab data={workloadData ?? []} isLoading={workloadLoading} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Status Summary (backed by /api/reports/status-summary)
// ---------------------------------------------------------------------------

function StatusSummaryTab({
  data,
  isLoading,
}: {
  data: StatusSummaryEntry[];
  isLoading: boolean;
}) {
  const totalIssues = data.reduce((s, d) => s + d.issueCount, 0);
  const totalPoints = data.reduce((s, d) => s + d.storyPoints, 0);

  const doneNames = ['done', 'completed', 'closed'];
  const progressNames = ['progress', 'review', 'testing'];

  const doneCount = data
    .filter((d) => doneNames.some((n) => d.statusName.toLowerCase().includes(n)))
    .reduce((s, d) => s + d.issueCount, 0);

  const inProgressCount = data
    .filter((d) => progressNames.some((n) => d.statusName.toLowerCase().includes(n)))
    .reduce((s, d) => s + d.issueCount, 0);

  const openCount = totalIssues - doneCount;

  const chartData = data
    .filter((d) => d.issueCount > 0)
    .map((d) => ({
      name: d.statusName,
      value: d.issueCount,
      points: d.storyPoints,
      color: d.color,
    }));

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Issues" value={totalIssues} />
        <MetricCard label="Story Points" value={totalPoints} subtitle="Total estimated" />
        <MetricCard label="Open" value={openCount} subtitle="Not done" />
        <MetricCard label="In Progress" value={inProgressCount} />
        <MetricCard label="Done" value={doneCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status donut */}
        <Card>
          <CardHeader>
            <CardTitle>Issues by Status</CardTitle>
          </CardHeader>
          <div className="mt-4">
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">
                No issue data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props) => {
                      const points = (props as { payload?: { points?: number } })?.payload?.points ?? 0;
                      return [`${value} issues (${points} pts)`, name];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Story Points by Status bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Story Points by Status</CardTitle>
          </CardHeader>
          <div className="mt-4">
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">
                No issue data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="points" name="Story Points" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Sprint Burndown (backed by /api/reports/burndown)
// ---------------------------------------------------------------------------

function BurndownTab({
  sprints,
  burndownData,
  selectedSprintId,
  onSelectSprint,
  isLoading,
}: {
  sprints: Sprint[];
  burndownData: BurndownResponse | null;
  selectedSprintId: string | null;
  onSelectSprint: (id: string) => void;
  isLoading: boolean;
}) {
  const sprintsWithDates = sprints.filter((s) => s.startDate && s.endDate);
  const burndownSprint = sprints.find((s) => s.id === selectedSprintId) ?? null;

  const chartData = (burndownData?.data ?? []).map((d) => ({
    day: format(parseISO(d.date), 'MMM d'),
    Ideal: d.ideal,
    Remaining: d.remaining,
  }));

  return (
    <div className="space-y-6">
      {/* Sprint selector */}
      {sprintsWithDates.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Sprint:</label>
          <div className="relative">
            <select
              value={selectedSprintId ?? ''}
              onChange={(e) => onSelectSprint(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              {sprintsWithDates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{' '}
                  {s.status === SprintStatus.ACTIVE ? '(Active)' : `(${s.status})`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {burndownData && (
            <span className="text-sm text-gray-500">
              {burndownData.totalPoints} total story points
            </span>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Burndown {burndownSprint ? `\u2014 ${burndownSprint.name}` : ''}
          </CardTitle>
        </CardHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : !burndownData || chartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {!selectedSprintId
                ? 'No active sprint found. Select a sprint with start and end dates.'
                : 'No burndown data available for this sprint.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Story Points', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Ideal"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="Remaining"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="#eef2ff"
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Velocity (backed by /api/reports/velocity)
// ---------------------------------------------------------------------------

function VelocityTab({
  data,
  isLoading,
}: {
  data: VelocityEntry[];
  isLoading: boolean;
}) {
  const chartData = data.map((d) => ({
    name: d.sprintName,
    Committed: d.committed,
    Completed: d.completed,
  }));

  const avgVelocity =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.completed, 0) / data.length)
      : 0;

  return (
    <div className="space-y-6">
      {avgVelocity > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Average Velocity" value={avgVelocity} subtitle="Story points per sprint" />
          <MetricCard
            label="Last Sprint"
            value={data.length > 0 ? data[data.length - 1].completed : 0}
            subtitle="Story points completed"
          />
          <MetricCard
            label="Sprints Tracked"
            value={data.length}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sprint Velocity (Story Points)</CardTitle>
        </CardHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              No completed or active sprints to display velocity data.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Story Points', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="Committed"
                  fill="#c7d2fe"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Completed"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Team Workload (backed by /api/reports/workload)
// ---------------------------------------------------------------------------

function WorkloadTab({
  data,
  isLoading,
}: {
  data: WorkloadEntry[];
  isLoading: boolean;
}) {
  const chartData = data.map((d) => ({
    name: d.name,
    Issues: d.issueCount,
    'Story Points': d.storyPoints,
    avatar: d.avatar,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Workload</CardTitle>
      </CardHeader>
      <div className="mt-4">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No issues assigned yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            {/* Team list */}
            <div className="space-y-3">
              {data.map((member) => (
                <div
                  key={member.userId ?? '__unassigned__'}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    name={member.name}
                    src={member.avatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.issueCount} issue{member.issueCount !== 1 ? 's' : ''}
                      {member.storyPoints > 0 && ` \u00b7 ${member.storyPoints} pts`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Horizontal bar chart */}
            <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="Issues"
                  fill="#c7d2fe"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="Story Points"
                  fill="#4f46e5"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
