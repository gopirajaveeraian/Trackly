-- Add performance indexes for common query patterns

-- Projects: frequently queried by workspace
CREATE INDEX IF NOT EXISTS "projects_workspaceId_idx" ON "projects"("workspaceId");

-- Sprints: filtered by project and status (e.g., find active sprint)
CREATE INDEX IF NOT EXISTS "sprints_projectId_status_idx" ON "sprints"("projectId", "status");

-- Notifications: sorted by date for a user
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- Activity logs: sorted by date for an issue
CREATE INDEX IF NOT EXISTS "activity_logs_issueId_createdAt_idx" ON "activity_logs"("issueId", "createdAt");

-- Releases: filtered by project and status
CREATE INDEX IF NOT EXISTS "releases_projectId_status_idx" ON "releases"("projectId", "status");

-- Sprint snapshots: sorted by date for burnup charts
CREATE INDEX IF NOT EXISTS "sprint_snapshots_sprintId_snapshotDate_idx" ON "sprint_snapshots"("sprintId", "snapshotDate");
