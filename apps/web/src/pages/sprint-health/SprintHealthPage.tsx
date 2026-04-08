import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
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
  HeartPulse,
  ChevronDown,
  Activity,
  Target,
  CalendarDays,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import {
  reportService,
  type SprintHealthData,
} from '@/services/report.service';
import { cn } from '@/utils/cn';
import { SprintStatus } from '@/types';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Health score helpers
// ---------------------------------------------------------------------------

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-success-500';
  if (score >= 50) return 'text-warning-500';
  return 'text-danger-600';
}

function getHealthBgColor(score: number): string {
  if (score >= 80) return 'bg-success-50';
  if (score >= 50) return 'bg-warning-50';
  return 'bg-danger-50';
}

function getHealthRingColor(score: number): string {
  if (score >= 80) return 'stroke-success-500';
  if (score >= 50) return 'stroke-warning-500';
  return 'stroke-danger-500';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'At Risk';
  return 'Off Track';
}

function getForecastLabel(score: number): string {
  if (score >= 80) return 'On Track';
  if (score >= 50) return 'At Risk';
  return 'Off Track';
}

function getForecastVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

function formatForecastDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
}

// ---------------------------------------------------------------------------
// Circular Gauge component
// ---------------------------------------------------------------------------

function HealthGauge({ score }: { score: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const ringColor = getHealthRingColor(score);
  const healthColor = getHealthColor(score);
  const healthBg = getHealthBgColor(score);
  const label = getHealthLabel(score);

  return (
    <div className={cn('flex flex-col items-center justify-center p-6 rounded-xl', healthBg)}>
      <div className="relative">
        <svg width="140" height="140" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className={cn('transition-all duration-700', ringColor)}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-3xl font-bold', healthColor)}>
            {score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <HeartPulse className={cn('h-4 w-4', healthColor)} />
        <span className={cn('text-sm font-semibold', healthColor)}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SprintHealthPage() {
  const { projectId } = useParams<{ projectId: string }>();
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

  // Auto-select active sprint
  const activeSprint = useMemo(
    () => sprints?.find((s) => s.status === SprintStatus.ACTIVE) ?? null,
    [sprints]
  );

  const sprintId = selectedSprintId ?? activeSprint?.id ?? null;
  const currentSprint = sprints?.find((s) => s.id === sprintId) ?? null;

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['sprint-health', sprintId],
    queryFn: () => reportService.getSprintHealth(sprintId!),
    enabled: !!sprintId,
  });

  // ---- Burn-up chart data ----
  const chartData = useMemo(() => {
    if (!healthData?.burnupData) return [];
    return healthData.burnupData.map((d) => ({
      day: format(parseISO(d.date), 'MMM d'),
      'Total Scope': d.total,
      Completed: d.completed,
    }));
  }, [healthData]);

  const isLoading = sprintsLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Sprint Health'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              Sprint health dashboard and burn-up analysis
            </p>
          </div>
        </div>
      </div>

      {/* Sprint Selector */}
      {!isLoading && sprints && sprints.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Sprint:</label>
          <div className="relative">
            <select
              value={sprintId ?? ''}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            >
              <option value="" disabled>
                Select a sprint
              </option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{' '}
                  {s.status === SprintStatus.ACTIVE ? '(Active)' : `(${s.status})`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {currentSprint && (
            <span className="text-sm text-gray-500">
              {currentSprint.startDate && currentSprint.endDate
                ? `${format(parseISO(currentSprint.startDate), 'MMM d')} - ${format(parseISO(currentSprint.endDate), 'MMM d, yyyy')}`
                : 'No dates set'}
            </span>
          )}
        </div>
      )}

      {/* Loading / Empty */}
      {isLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      ) : !sprintId ? (
        <Card>
          <EmptyState
            icon={<HeartPulse className="h-8 w-8" />}
            title="No sprint selected"
            description={
              sprints && sprints.length > 0
                ? 'Select a sprint above to view health metrics.'
                : 'Create a sprint first to see sprint health data.'
            }
          />
        </Card>
      ) : healthLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-6">
            <div className="h-36 bg-gray-100 rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded" />
              ))}
            </div>
            <div className="h-[300px] bg-gray-100 rounded" />
          </div>
        </Card>
      ) : !healthData ? (
        <Card>
          <EmptyState
            icon={<HeartPulse className="h-8 w-8" />}
            title="No health data"
            description="Health data is not yet available for this sprint. Ensure the sprint has start and end dates and contains issues."
          />
        </Card>
      ) : (
        <>
          {/* Health Score + Metrics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Health Gauge */}
            <HealthGauge score={healthData.healthScore} />

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Time Elapsed"
                value={`${healthData.timeElapsedPercent}%`}
                subtitle="Of sprint duration"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <MetricCard
                label="Completion"
                value={`${healthData.progressPercent}%`}
                subtitle={`${healthData.completedPoints} of ${healthData.totalPoints} points`}
                icon={<Target className="h-4 w-4" />}
              />
              <MetricCard
                label="Scope Changes"
                value={healthData.scopeChanges}
                subtitle="Items added/removed"
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricCard
                label="Forecast"
                value={formatForecastDate(healthData.completionForecast)}
                subtitle={getForecastLabel(healthData.healthScore)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                label="Total Points"
                value={healthData.totalPoints}
                subtitle={`${healthData.totalIssues} issues`}
              />
              <MetricCard
                label="Completed Points"
                value={healthData.completedPoints}
                subtitle={`${healthData.completedIssues} issues done`}
              />
            </div>
          </div>

          {/* Forecast badge */}
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Sprint Forecast:</span>
            <Badge variant={getForecastVariant(healthData.healthScore)}>
              {getForecastLabel(healthData.healthScore)}
            </Badge>
            {healthData.completionForecast && (
              <span className="text-sm text-gray-500">
                — Estimated completion: {formatForecastDate(healthData.completionForecast)}
              </span>
            )}
          </div>

          {/* Burn-up Chart */}
          <Card>
            <CardHeader>
              <CardTitle>
                Burn-up Chart {currentSprint ? `\u2014 ${currentSprint.name}` : ''}
              </CardTitle>
            </CardHeader>
            <div className="mt-4">
              {chartData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  No burn-up data available for this sprint.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      label={{
                        value: 'Story Points',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 10,
                        style: { fontSize: 11 },
                      }}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Total Scope"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      fill="#f1f5f9"
                      fillOpacity={0.4}
                    />
                    <Area
                      type="monotone"
                      dataKey="Completed"
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
        </>
      )}
    </div>
  );
}
