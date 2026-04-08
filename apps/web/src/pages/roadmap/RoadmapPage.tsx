import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Map,
  Layers,
  Package,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import {
  roadmapService,
  type RoadmapItem,
} from '@/services/roadmap.service';
import { cn } from '@/utils/cn';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  differenceInDays,
  format,
  isWithinInterval,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the pixel position (as percentage) of a date within a timeline range.
 */
function getDatePosition(
  date: Date,
  timelineStart: Date,
  timelineEnd: Date
): number {
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  if (totalDays <= 0) return 0;
  const dayOffset = differenceInDays(date, timelineStart);
  return Math.max(0, Math.min(100, (dayOffset / totalDays) * 100));
}

/**
 * Computes the left% and width% for a bar on the timeline.
 */
function getBarStyle(
  startDate: string | null,
  endDate: string | null,
  timelineStart: Date,
  timelineEnd: Date
): { left: string; width: string } | null {
  if (!startDate && !endDate) return null;

  const barStart = startDate ? parseISO(startDate) : timelineStart;
  const barEnd = endDate ? parseISO(endDate) : timelineEnd;

  // Clamp to timeline
  const clampedStart = isBefore(barStart, timelineStart) ? timelineStart : barStart;
  const clampedEnd = isAfter(barEnd, timelineEnd) ? timelineEnd : barEnd;

  const left = getDatePosition(clampedStart, timelineStart, timelineEnd);
  const right = getDatePosition(clampedEnd, timelineStart, timelineEnd);
  const width = Math.max(right - left, 1); // Minimum 1% width

  return {
    left: `${left}%`,
    width: `${width}%`,
  };
}

/**
 * Generates an array of months between the timeline start and end.
 */
function getMonthMarkers(
  timelineStart: Date,
  timelineEnd: Date
): { label: string; left: string; width: string }[] {
  const markers: { label: string; left: string; width: string }[] = [];
  let current = startOfMonth(timelineStart);

  while (isBefore(current, timelineEnd) || format(current, 'yyyy-MM') === format(timelineEnd, 'yyyy-MM')) {
    const monthStart = isBefore(current, timelineStart) ? timelineStart : current;
    const monthEnd_ = endOfMonth(current);
    const monthEnd = isAfter(monthEnd_, timelineEnd) ? timelineEnd : monthEnd_;

    const left = getDatePosition(monthStart, timelineStart, timelineEnd);
    const right = getDatePosition(monthEnd, timelineStart, timelineEnd);
    const width = Math.max(right - left, 0);

    if (width > 0) {
      markers.push({
        label: format(current, 'MMM yyyy'),
        left: `${left}%`,
        width: `${width}%`,
      });
    }

    current = addMonths(current, 1);
    current = startOfMonth(current);
  }

  return markers;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function RoadmapPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // ---- Queries ----
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.get(projectId!),
    enabled: !!projectId,
  });

  const { data: roadmapData, isLoading } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => roadmapService.get(projectId!),
    enabled: !!projectId,
  });

  // ---- Compute timeline bounds ----
  const allItems: RoadmapItem[] = useMemo(() => {
    if (!roadmapData) return [];
    return [...roadmapData.epics, ...roadmapData.releases];
  }, [roadmapData]);

  const itemsWithDates = useMemo(
    () => allItems.filter((item) => item.startDate || item.endDate),
    [allItems]
  );

  const { timelineStart, timelineEnd, todayPosition } = useMemo(() => {
    const today = startOfDay(new Date());

    if (itemsWithDates.length === 0) {
      // Default: 3 months before and after today
      const start = addMonths(today, -1);
      const end = addMonths(today, 3);
      const totalDays = differenceInDays(end, start);
      const todayOffset = differenceInDays(today, start);
      return {
        timelineStart: start,
        timelineEnd: end,
        todayPosition: totalDays > 0 ? (todayOffset / totalDays) * 100 : 0,
      };
    }

    // Find min/max dates
    let minDate = today;
    let maxDate = today;

    for (const item of itemsWithDates) {
      if (item.startDate) {
        const d = parseISO(item.startDate);
        if (isBefore(d, minDate)) minDate = d;
      }
      if (item.endDate) {
        const d = parseISO(item.endDate);
        if (isAfter(d, maxDate)) maxDate = d;
      }
    }

    // Add 1 month padding on each side
    const start = startOfMonth(addMonths(minDate, -1));
    const end = endOfMonth(addMonths(maxDate, 1));
    const totalDays = differenceInDays(end, start);
    const todayOffset = differenceInDays(today, start);

    return {
      timelineStart: start,
      timelineEnd: end,
      todayPosition: totalDays > 0 ? (todayOffset / totalDays) * 100 : 0,
    };
  }, [itemsWithDates]);

  const monthMarkers = useMemo(
    () => getMonthMarkers(timelineStart, timelineEnd),
    [timelineStart, timelineEnd]
  );

  const epics = roadmapData?.epics ?? [];
  const releases = roadmapData?.releases ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? 'Roadmap'}
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              Timeline view of epics and releases
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <Card className="animate-pulse">
          <div className="space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      ) : itemsWithDates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Map className="h-8 w-8" />}
            title="No timeline data"
            description="Add start and end dates to your epics and releases to see them on the roadmap timeline."
          />
        </Card>
      ) : (
        <Card padding="none">
          {/* Legend */}
          <div className="flex items-center gap-6 px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded bg-accent-500" />
              <span>Epics</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-3 h-3 rounded bg-primary-500" />
              <span>Releases</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-0.5 h-3 bg-danger-500" />
              <span>Today</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Month headers */}
              <div className="relative h-10 border-b border-gray-200 bg-gray-50">
                {monthMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full flex items-center border-l border-gray-200"
                    style={{ left: marker.left, width: marker.width }}
                  >
                    <span className="px-2 text-xs font-medium text-gray-500 truncate">
                      {marker.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="relative">
                {/* Today marker */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-danger-500 z-10"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-danger-500 text-white text-[9px] px-1 rounded-b">
                      Today
                    </div>
                  </div>
                )}

                {/* Epics section */}
                {epics.length > 0 && (
                  <>
                    <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Layers className="h-3.5 w-3.5" />
                        Epics
                      </div>
                    </div>
                    {epics.map((item) => (
                      <TimelineRow
                        key={item.id}
                        item={item}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                        barColor="bg-accent-500"
                        barBg="bg-accent-100"
                      />
                    ))}
                  </>
                )}

                {/* Releases section */}
                {releases.length > 0 && (
                  <>
                    <div className="px-5 py-2 bg-gray-50/50 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Package className="h-3.5 w-3.5" />
                        Releases
                      </div>
                    </div>
                    {releases.map((item) => (
                      <TimelineRow
                        key={item.id}
                        item={item}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                        barColor="bg-primary-500"
                        barBg="bg-primary-100"
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Row sub-component
// ---------------------------------------------------------------------------

interface TimelineRowProps {
  item: RoadmapItem;
  timelineStart: Date;
  timelineEnd: Date;
  barColor: string;
  barBg: string;
}

function TimelineRow({
  item,
  timelineStart,
  timelineEnd,
  barColor,
  barBg,
}: TimelineRowProps) {
  const barStyle = getBarStyle(item.startDate, item.endDate, timelineStart, timelineEnd);
  const progressPercent =
    item.progress.total > 0
      ? (item.progress.done / item.progress.total) * 100
      : 0;

  return (
    <div className="flex items-center border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      {/* Row label */}
      <div className="w-48 flex-shrink-0 px-5 py-3 border-r border-gray-100">
        <div className="flex items-center gap-2">
          {item.type === 'epic' ? (
            <Layers className="h-3.5 w-3.5 text-accent-600 flex-shrink-0" />
          ) : (
            <Package className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-900 truncate">
            {item.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">
            {item.progress.done}/{item.progress.total}
          </span>
          {item.status && (
            <Badge
              variant={
                item.status === 'RELEASED' || item.status === 'COMPLETED'
                  ? 'success'
                  : item.status === 'IN_PROGRESS' || item.status === 'ACTIVE'
                    ? 'primary'
                    : 'default'
              }
              className="text-[9px] px-1.5 py-0"
            >
              {item.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline bar area */}
      <div className="flex-1 relative h-14 px-2">
        {barStyle ? (
          <div
            className={cn('absolute top-1/2 -translate-y-1/2 h-6 rounded-md', barBg)}
            style={{ left: barStyle.left, width: barStyle.width }}
          >
            {/* Progress fill */}
            <div
              className={cn('h-full rounded-md transition-all', barColor)}
              style={{ width: `${progressPercent}%`, opacity: 0.85 }}
            />
            {/* Label overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-gray-700 truncate px-2">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute top-1/2 -translate-y-1/2 left-2 text-[10px] text-gray-400 italic flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            No dates
          </div>
        )}
      </div>
    </div>
  );
}
