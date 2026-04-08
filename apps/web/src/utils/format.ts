import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Formats an issue key like Jira (e.g., "TRK-42").
 */
export function formatIssueKey(projectKey: string, issueNumber: number): string {
  return `${projectKey}-${issueNumber}`;
}

/**
 * Formats a date to a human-readable relative string.
 */
export function formatRelativeDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  if (!isValid(date)) return 'Invalid date';
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Formats a date to a short date string (e.g., "Mar 15, 2026").
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy');
}

/**
 * Formats a date to a short date and time string.
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'MMM d, yyyy h:mm a');
}

/**
 * Formats story points for display.
 */
export function formatPoints(points: number | null | undefined): string {
  if (points == null || points === 0) return '-';
  return points % 1 === 0 ? String(points) : points.toFixed(1);
}

/**
 * Formats hours to a human-readable string (e.g., "2h 30m").
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || hours === 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Truncates text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
