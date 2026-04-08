import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ChevronDown,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { sprintService } from '@/services/sprint.service';
import {
  capacityService,
  type CapacityEntry,
} from '@/services/capacity.service';
import { cn } from '@/utils/cn';
import { SprintStatus } from '@/types';
import type { Sprint } from '@/types';

// ---------------------------------------------------------------------------
// Utilization color helper
// ---------------------------------------------------------------------------

function getUtilizationColor(percent: number): string {
  if (percent > 100) return 'text-danger-600';
  if (percent >= 80) return 'text-warning-500';
  return 'text-success-500';
}

function getUtilizationBgColor(percent: number): string {
  if (percent > 100) return 'bg-danger-500';
  if (percent >= 80) return 'bg-warning-400';
  return 'bg-success-400';
}

function getUtilizationTrackColor(percent: number): string {
  if (percent > 100) return 'bg-danger-100';
  if (percent >= 80) return 'bg-warning-100';
  return 'bg-success-100';
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function CapacityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [editedHours, setEditedHours] = useState<Record<string, number>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const { data: capacities, isLoading: capacitiesLoading, dataUpdatedAt } = useQuery({
    queryKey: ['capacities', sprintId],
    queryFn: () => capacityService.list(sprintId!),
    enabled: !!sprintId,
  });

  // Reset edited hours when capacities are freshly fetched
  useEffect(() => {
    if (dataUpdatedAt) {
      setEditedHours({});
      setHasUnsavedChanges(false);
    }
  }, [dataUpdatedAt]);

  // ---- Mutations ----
  const upsertMutation = useMutation({
    mutationFn: (data: { userId: string; sprintId: string; availableHours: number }) =>
      capacityService.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacities', sprintId] });
    },
  });

  // ---- Handlers ----
  const handleHoursChange = useCallback(
    (userId: string, value: string) => {
      const hours = parseFloat(value) || 0;
      setEditedHours((prev) => ({ ...prev, [userId]: hours }));
      setHasUnsavedChanges(true);
    },
    []
  );

  async function handleSaveAll() {
    if (!sprintId) return;

    const promises = Object.entries(editedHours).map(([userId, availableHours]) =>
      upsertMutation.mutateAsync({ userId, sprintId, availableHours })
    );

    await Promise.all(promises);
    setEditedHours({});
    setHasUnsavedChanges(false);
    queryClient.invalidateQueries({ queryKey: ['capacities', sprintId] });
  }

  // ---- Derived data ----
  const capacityRows = useMemo(() => {
    if (!capacities) return [];
    return capacities.map((entry) => {
      const available = editedHours[entry.userId] ?? entry.availableHours;
      const allocated = entry.allocatedHours;
      const utilization = available > 0 ? (allocated / available) * 100 : 0;
      return {
        ...entry,
        displayAvailable: available,
        displayAllocated: allocated,
        utilization,
      };
    });
  }, [capacities, editedHours]);

  const teamTotals = useMemo(() => {
    const totalAvailable = capacityRows.reduce((s, r) => s + r.displayAvailable, 0);
    const totalAllocated = capacityRows.reduce((s, r) => s + r.displayAllocated, 0);
    const teamUtilization = totalAvailable > 0 ? (totalAllocated / totalAvailable) * 100 : 0;
    return { totalAvailable, totalAllocated, teamUtilization };
  }, [capacityRows]);

  const isLoading = sprintsLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Capacity Planning'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              Plan team capacity for sprint iterations
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
              onChange={(e) => {
                setSelectedSprintId(e.target.value);
                setEditedHours({});
                setHasUnsavedChanges(false);
              }}
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

          {hasUnsavedChanges && (
            <Button
              size="sm"
              leftIcon={<Save className="h-3.5 w-3.5" />}
              onClick={handleSaveAll}
              isLoading={upsertMutation.isPending}
            >
              Save Changes
            </Button>
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
            icon={<Users className="h-8 w-8" />}
            title="No sprint selected"
            description={
              sprints && sprints.length > 0
                ? 'Select a sprint above to manage team capacity.'
                : 'Create a sprint first to start capacity planning.'
            }
          />
        </Card>
      ) : capacitiesLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      ) : capacityRows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No team members"
            description="No capacity data available for this sprint. Assign team members to the project first."
          />
        </Card>
      ) : (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Team Members"
              value={capacityRows.length}
              subtitle={`In ${currentSprint?.name ?? 'sprint'}`}
            />
            <MetricCard
              label="Total Available"
              value={`${teamTotals.totalAvailable}h`}
              subtitle="Combined team hours"
            />
            <MetricCard
              label="Team Utilization"
              value={`${Math.round(teamTotals.teamUtilization)}%`}
              subtitle={`${teamTotals.totalAllocated}h allocated`}
            />
          </div>

          {/* Capacity Table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-5 py-3 text-left">Team Member</th>
                    <th className="px-5 py-3 text-center w-40">Available Hours</th>
                    <th className="px-5 py-3 text-center w-32">Allocated Hours</th>
                    <th className="px-5 py-3 text-center w-48">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {capacityRows.map((row) => {
                    const utilPercent = row.utilization;
                    const utilizationColor = getUtilizationColor(utilPercent);
                    const barBg = getUtilizationBgColor(utilPercent);
                    const trackBg = getUtilizationTrackColor(utilPercent);

                    return (
                      <tr key={row.id} className="table-row">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={row.user.name}
                              src={row.user.avatar}
                              size="sm"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {row.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editedHours[row.userId] ?? row.availableHours}
                              onChange={(e) => handleHoursChange(row.userId, e.target.value)}
                              className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-center text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-sm font-medium text-gray-700">
                            {row.displayAllocated}h
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex-1 h-2 rounded-full', trackBg)}>
                              <div
                                className={cn('h-full rounded-full transition-all', barBg)}
                                style={{ width: `${Math.min(utilPercent, 100)}%` }}
                              />
                            </div>
                            <span className={cn('text-sm font-semibold w-14 text-right', utilizationColor)}>
                              {Math.round(utilPercent)}%
                            </span>
                            {utilPercent > 100 && (
                              <AlertTriangle className="h-4 w-4 text-danger-500 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-700">Team Total</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-gray-700">
                        {teamTotals.totalAvailable}h
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-sm text-gray-700">
                        {teamTotals.totalAllocated}h
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex-1 h-2 rounded-full',
                            getUtilizationTrackColor(teamTotals.teamUtilization)
                          )}
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              getUtilizationBgColor(teamTotals.teamUtilization)
                            )}
                            style={{
                              width: `${Math.min(teamTotals.teamUtilization, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-sm font-semibold w-14 text-right',
                            getUtilizationColor(teamTotals.teamUtilization)
                          )}
                        >
                          {Math.round(teamTotals.teamUtilization)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
