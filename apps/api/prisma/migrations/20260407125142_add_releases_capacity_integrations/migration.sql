-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'RELEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('GITHUB', 'CONFLUENCE', 'SLACK', 'JIRA', 'BITBUCKET', 'GITLAB');

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "releaseId" TEXT;

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_snapshots" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "completedPoints" DOUBLE PRECISION NOT NULL,
    "totalIssues" INTEGER NOT NULL,
    "completedIssues" INTEGER NOT NULL,
    "scopeChanges" INTEGER NOT NULL DEFAULT 0,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprint_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "availableHours" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "allocatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "releases_projectId_idx" ON "releases"("projectId");

-- CreateIndex
CREATE INDEX "sprint_snapshots_sprintId_idx" ON "sprint_snapshots"("sprintId");

-- CreateIndex
CREATE INDEX "capacities_sprintId_idx" ON "capacities"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "capacities_userId_sprintId_key" ON "capacities"("userId", "sprintId");

-- CreateIndex
CREATE INDEX "integrations_workspaceId_idx" ON "integrations"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_type_workspaceId_key" ON "integrations"("type", "workspaceId");

-- CreateIndex
CREATE INDEX "activity_logs_issueId_idx" ON "activity_logs"("issueId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "attachments_issueId_idx" ON "attachments"("issueId");

-- CreateIndex
CREATE INDEX "comments_issueId_idx" ON "comments"("issueId");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "issue_links_sourceIssueId_idx" ON "issue_links"("sourceIssueId");

-- CreateIndex
CREATE INDEX "issue_links_targetIssueId_idx" ON "issue_links"("targetIssueId");

-- CreateIndex
CREATE INDEX "issues_projectId_idx" ON "issues"("projectId");

-- CreateIndex
CREATE INDEX "issues_assigneeId_idx" ON "issues"("assigneeId");

-- CreateIndex
CREATE INDEX "issues_reporterId_idx" ON "issues"("reporterId");

-- CreateIndex
CREATE INDEX "issues_statusId_idx" ON "issues"("statusId");

-- CreateIndex
CREATE INDEX "issues_sprintId_idx" ON "issues"("sprintId");

-- CreateIndex
CREATE INDEX "issues_epicId_idx" ON "issues"("epicId");

-- CreateIndex
CREATE INDEX "issues_projectId_statusId_idx" ON "issues"("projectId", "statusId");

-- CreateIndex
CREATE INDEX "issues_projectId_assigneeId_idx" ON "issues"("projectId", "assigneeId");

-- CreateIndex
CREATE INDEX "issues_releaseId_idx" ON "issues"("releaseId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "sprints_projectId_idx" ON "sprints"("projectId");

-- CreateIndex
CREATE INDEX "statuses_projectId_idx" ON "statuses"("projectId");

-- CreateIndex
CREATE INDEX "time_logs_issueId_idx" ON "time_logs"("issueId");

-- CreateIndex
CREATE INDEX "time_logs_userId_idx" ON "time_logs"("userId");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_snapshots" ADD CONSTRAINT "sprint_snapshots_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacities" ADD CONSTRAINT "capacities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacities" ADD CONSTRAINT "capacities_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
