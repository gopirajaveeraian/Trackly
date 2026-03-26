import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main(): Promise<void> {
  console.log('Seeding database with comprehensive test data...\n');

  // ─── Clean existing data ────────────────────────────────────────────────
  await prisma.timeLog.deleteMany();
  await prisma.watcher.deleteMany();
  await prisma.issueLabel.deleteMany();
  await prisma.issueLink.deleteMany();
  await prisma.label.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.status.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create 10 team members ───────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 12);

  const teamData = [
    { name: 'Vikram Gopiraja', email: 'vikram@trackly.com', role: 'ADMIN' as const },
    { name: 'Sarah Chen', email: 'sarah@trackly.com', role: 'PROJECT_MANAGER' as const },
    { name: 'Alex Rodriguez', email: 'alex@trackly.com', role: 'DEVELOPER' as const },
    { name: 'Priya Sharma', email: 'priya@trackly.com', role: 'DEVELOPER' as const },
    { name: 'James Wilson', email: 'james@trackly.com', role: 'DEVELOPER' as const },
    { name: 'Emily Park', email: 'emily@trackly.com', role: 'DEVELOPER' as const },
    { name: 'Raj Patel', email: 'raj@trackly.com', role: 'DEVELOPER' as const },
    { name: 'Maria Garcia', email: 'maria@trackly.com', role: 'DEVELOPER' as const },
    { name: 'David Kim', email: 'david@trackly.com', role: 'DEVELOPER' as const },
    { name: 'Lisa Thompson', email: 'lisa@trackly.com', role: 'VIEWER' as const },
  ];

  const users = await Promise.all(
    teamData.map((u) =>
      prisma.user.create({
        data: { name: u.name, email: u.email, password: hashedPassword },
      })
    )
  );

  console.log(`Created ${users.length} team members`);

  // ─── Create workspace ─────────────────────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: { name: 'Trackly Engineering', slug: 'trackly-eng' },
  });

  await prisma.workspaceMember.createMany({
    data: users.map((u, i) => ({
      userId: u.id,
      workspaceId: workspace.id,
      role: teamData[i].role,
    })),
  });

  console.log(`Created workspace: ${workspace.name} (${users.length} members)`);

  // ─── Create Scrum project ────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      name: 'Trackly Platform',
      key: 'TRK',
      type: 'SCRUM',
      description:
        'End-to-end project management platform with Scrum & Kanban boards, sprint planning, epics, and real-time collaboration.',
      workspaceId: workspace.id,
    },
  });

  console.log(`Created project: ${project.name} (Scrum)`);

  // ─── Create statuses ──────────────────────────────────────────────────
  const [todoStatus, inProgressStatus, inReviewStatus, doneStatus] = await Promise.all([
    prisma.status.create({ data: { name: 'To Do', color: '#6B7280', order: 0, projectId: project.id } }),
    prisma.status.create({ data: { name: 'In Progress', color: '#3B82F6', order: 1, projectId: project.id } }),
    prisma.status.create({ data: { name: 'In Review', color: '#F59E0B', order: 2, projectId: project.id } }),
    prisma.status.create({ data: { name: 'Done', color: '#10B981', order: 3, projectId: project.id } }),
  ]);

  const statuses = { todo: todoStatus, inProgress: inProgressStatus, inReview: inReviewStatus, done: doneStatus };
  console.log('Created statuses: To Do, In Progress, In Review, Done');

  // ─── Helpers ──────────────────────────────────────────────────────────
  const [vikram, sarah, alex, priya, james, emily, raj, maria, david, lisa] = users;
  const devs = [alex, priya, james, emily, raj, maria, david]; // developers
  let issueNumber = 0;
  const allIssues: Array<{ id: string; title: string; reporterId: string; assigneeId: string | null }> = [];

  async function createIssue(data: {
    title: string;
    description: string;
    type: 'BUG' | 'STORY' | 'TASK' | 'EPIC' | 'SUBTASK';
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    statusId: string;
    assigneeId?: string;
    reporterId: string;
    sprintId?: string;
    epicId?: string;
    dueDate?: Date;
    createdAt?: Date;
  }) {
    issueNumber++;
    const issue = await prisma.issue.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        number: issueNumber,
        statusId: data.statusId,
        projectId: project.id,
        assigneeId: data.assigneeId,
        reporterId: data.reporterId,
        sprintId: data.sprintId,
        epicId: data.epicId,
        dueDate: data.dueDate,
        createdAt: data.createdAt ?? new Date(),
      },
    });
    allIssues.push({ id: issue.id, title: issue.title, reporterId: issue.reporterId, assigneeId: issue.assigneeId });
    return issue;
  }

  // ─── Create Epics ─────────────────────────────────────────────────────
  const epicAuth = await createIssue({
    title: 'Authentication & Authorization',
    description: 'Complete auth system: JWT login/register, role-based access control, password reset, session management with refresh tokens.',
    type: 'EPIC', priority: 'HIGH', statusId: doneStatus.id,
    reporterId: vikram.id, createdAt: daysAgo(56),
  });

  const epicBoard = await createIssue({
    title: 'Board & Drag-and-Drop',
    description: 'Kanban and Scrum board views with drag-and-drop issue management, swimlanes, and WIP limits.',
    type: 'EPIC', priority: 'HIGH', statusId: doneStatus.id,
    reporterId: sarah.id, createdAt: daysAgo(56),
  });

  const epicSprint = await createIssue({
    title: 'Sprint Management',
    description: 'Sprint creation, planning, start/complete workflows, backlog grooming, and sprint goal tracking.',
    type: 'EPIC', priority: 'HIGH', statusId: doneStatus.id,
    reporterId: sarah.id, createdAt: daysAgo(42),
  });

  const epicReports = await createIssue({
    title: 'Reports & Analytics',
    description: 'Burndown charts, velocity tracking, cumulative flow diagrams, team workload reports.',
    type: 'EPIC', priority: 'MEDIUM', statusId: inProgressStatus.id,
    reporterId: vikram.id, createdAt: daysAgo(28),
  });

  const epicNotifications = await createIssue({
    title: 'Real-time Notifications',
    description: 'Socket.io-based real-time notifications, in-app notification center, email digests.',
    type: 'EPIC', priority: 'MEDIUM', statusId: inProgressStatus.id,
    reporterId: vikram.id, createdAt: daysAgo(21),
  });

  console.log('Created 5 epics');

  // ═══════════════════════════════════════════════════════════════════════
  // SPRINT 1 — "Foundation" (COMPLETED, 6 weeks ago → 4 weeks ago)
  // ═══════════════════════════════════════════════════════════════════════
  const sprint1 = await prisma.sprint.create({
    data: {
      name: 'Sprint 1 — Foundation',
      goal: 'Set up auth, project CRUD, and basic UI layout',
      startDate: daysAgo(56),
      endDate: daysAgo(42),
      status: 'COMPLETED',
      projectId: project.id,
    },
  });

  // All sprint 1 issues → Done
  const s1Issues = [
    { title: 'User registration with email verification', desc: 'Build registration form with Zod validation, send verification email, create user in DB with hashed password.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: alex },
    { title: 'JWT login with refresh tokens', desc: 'Implement login endpoint, issue access + refresh JWTs, store refresh token in httpOnly cookie.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: alex },
    { title: 'Password reset flow', desc: 'Forgot password page, send reset email with token, validate token, update password.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: priya },
    { title: 'Role-based access control middleware', desc: 'Express middleware to check user roles (Admin, PM, Dev, Viewer) on protected routes.', type: 'TASK' as const, priority: 'HIGH' as const, assignee: alex },
    { title: 'Sidebar navigation component', desc: 'Collapsible sidebar with project list, navigation links, workspace selector, and user avatar.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: emily },
    { title: 'Top navbar with search and notifications', desc: 'Responsive navbar with global search input, notification bell icon, and user dropdown menu.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: emily },
    { title: 'Project CRUD API endpoints', desc: 'REST endpoints for creating, reading, updating, and deleting projects with validation.', type: 'TASK' as const, priority: 'HIGH' as const, assignee: james },
    { title: 'Project list and detail pages', desc: 'Frontend pages for viewing all projects (card grid) and individual project details.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: raj },
    { title: 'Workspace creation and member invite', desc: 'API + UI for creating workspaces, inviting members by email, managing roles.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: maria },
    { title: 'Set up CI pipeline with GitHub Actions', desc: 'Configure build, lint, and test workflows for PRs and main branch.', type: 'TASK' as const, priority: 'LOW' as const, assignee: david },
    { title: 'Fix CORS configuration for dev proxy', desc: 'Vite proxy not forwarding cookies correctly. Update CORS options and proxy config.', type: 'BUG' as const, priority: 'CRITICAL' as const, assignee: alex },
    { title: 'Tailwind + shadcn/ui theming setup', desc: 'Configure custom color palette (indigo/purple gradient), dark mode support, and base component styles.', type: 'TASK' as const, priority: 'MEDIUM' as const, assignee: emily },
  ];

  for (let i = 0; i < s1Issues.length; i++) {
    await createIssue({
      title: s1Issues[i].title, description: s1Issues[i].desc,
      type: s1Issues[i].type, priority: s1Issues[i].priority,
      statusId: doneStatus.id, assigneeId: s1Issues[i].assignee.id,
      reporterId: randomItem([vikram, sarah]).id,
      sprintId: sprint1.id, epicId: epicAuth.id,
      createdAt: daysAgo(56 - i),
    });
  }

  console.log(`Sprint 1: ${s1Issues.length} issues (all Done)`);

  // ═══════════════════════════════════════════════════════════════════════
  // SPRINT 2 — "Core Features" (COMPLETED, 4 weeks ago → 2 weeks ago)
  // ═══════════════════════════════════════════════════════════════════════
  const sprint2 = await prisma.sprint.create({
    data: {
      name: 'Sprint 2 — Core Features',
      goal: 'Build Kanban board, issue CRUD, and drag-and-drop',
      startDate: daysAgo(42),
      endDate: daysAgo(28),
      status: 'COMPLETED',
      projectId: project.id,
    },
  });

  const s2Issues = [
    { title: 'Issue CRUD API with filtering', desc: 'REST endpoints for issues with query params: status, assignee, priority, type, sprint. Cursor pagination.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: james, epic: epicBoard },
    { title: 'Issue detail page with sidebar', desc: 'Full issue view with editable fields, status dropdown, assignee picker, priority, due date, and description editor.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: raj, epic: epicBoard },
    { title: 'Kanban board with DnD columns', desc: 'Board view with status columns. Drag issues between columns using @dnd-kit. Optimistic cache updates.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: priya, epic: epicBoard },
    { title: 'Cross-column drag and drop', desc: 'Support dragging issues across different status columns with DragOverEvent handling and empty column drops.', type: 'TASK' as const, priority: 'HIGH' as const, assignee: priya, epic: epicBoard },
    { title: 'Issue reordering within columns', desc: 'Drag to reorder issues within a status column. Persist order to database.', type: 'TASK' as const, priority: 'MEDIUM' as const, assignee: priya, epic: epicBoard },
    { title: 'Rich text editor for descriptions', desc: 'Integrate Tiptap editor for issue descriptions with bold, italic, lists, code blocks, and links.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: emily, epic: epicBoard },
    { title: 'Comment system with @mentions', desc: 'Add, edit, delete comments on issues. @mention users with autocomplete dropdown.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: maria, epic: epicBoard },
    { title: 'Custom status management per project', desc: 'UI for admins to create, edit, reorder, and delete custom statuses for each project.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: james, epic: epicBoard },
    { title: 'Board swimlanes (Assignee/Priority)', desc: 'Toggle swimlane grouping on the board by None, Assignee, or Priority.', type: 'TASK' as const, priority: 'LOW' as const, assignee: raj, epic: epicBoard },
    { title: 'Fix issue card truncation on mobile', desc: 'Issue cards on the board overflow on screens < 768px. Add responsive text truncation.', type: 'BUG' as const, priority: 'MEDIUM' as const, assignee: emily, epic: epicBoard },
    { title: 'API rate limiting middleware', desc: 'Add express-rate-limit to prevent abuse. 100 req/min for auth, 300 req/min for other endpoints.', type: 'TASK' as const, priority: 'LOW' as const, assignee: david, epic: epicBoard },
    { title: 'Issue labels and color coding', desc: 'Create label model, assign labels to issues, display colored badges on cards and detail page.', type: 'STORY' as const, priority: 'LOW' as const, assignee: maria, epic: epicBoard },
    { title: 'Bulk issue status update', desc: 'Select multiple issues in list view and change their status in bulk.', type: 'TASK' as const, priority: 'MEDIUM' as const, assignee: alex, epic: epicBoard },
  ];

  for (let i = 0; i < s2Issues.length; i++) {
    await createIssue({
      title: s2Issues[i].title, description: s2Issues[i].desc,
      type: s2Issues[i].type, priority: s2Issues[i].priority,
      statusId: doneStatus.id, assigneeId: s2Issues[i].assignee.id,
      reporterId: randomItem([vikram, sarah, alex]).id,
      sprintId: sprint2.id, epicId: s2Issues[i].epic.id,
      createdAt: daysAgo(42 - i),
    });
  }

  console.log(`Sprint 2: ${s2Issues.length} issues (all Done)`);

  // ═══════════════════════════════════════════════════════════════════════
  // SPRINT 3 — "Agile Features" (COMPLETED, 2 weeks ago → yesterday)
  // ═══════════════════════════════════════════════════════════════════════
  const sprint3 = await prisma.sprint.create({
    data: {
      name: 'Sprint 3 — Agile Features',
      goal: 'Sprint management, backlog view, epics, and initial reports',
      startDate: daysAgo(28),
      endDate: daysAgo(14),
      status: 'COMPLETED',
      projectId: project.id,
    },
  });

  const s3Issues = [
    { title: 'Sprint CRUD API endpoints', desc: 'Create, read, update sprints. Start and complete sprint actions with validation.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: james, epic: epicSprint, status: doneStatus },
    { title: 'Sprint planning page', desc: 'UI for creating sprints, setting goals, start/end dates. Drag issues from backlog into sprint.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: raj, epic: epicSprint, status: doneStatus },
    { title: 'Sprint start/complete workflow', desc: 'Start button activates sprint. Complete button moves unfinished issues to next sprint or backlog.', type: 'TASK' as const, priority: 'HIGH' as const, assignee: james, epic: epicSprint, status: doneStatus },
    { title: 'Backlog management view', desc: 'Sortable backlog list with drag-to-prioritize, bulk select, move-to-sprint dropdown.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: priya, epic: epicSprint, status: doneStatus },
    { title: 'Epic CRUD and progress tracking', desc: 'Create/edit epics, link issues, show progress bar (done/total), timeline view.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: maria, epic: epicSprint, status: doneStatus },
    { title: 'Sprint board with sprint selector', desc: 'Board view filtered by sprint. Dropdown to switch between active and past sprints.', type: 'TASK' as const, priority: 'MEDIUM' as const, assignee: raj, epic: epicSprint, status: doneStatus },
    { title: 'Backlog issue count badges', desc: 'Show count of backlog items by priority on the sidebar and backlog page header.', type: 'TASK' as const, priority: 'LOW' as const, assignee: emily, epic: epicSprint, status: doneStatus },
    { title: 'Sprint burndown chart', desc: 'Line chart showing ideal vs actual remaining work over the sprint duration.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: david, epic: epicReports, status: doneStatus },
    { title: 'Velocity chart', desc: 'Grouped bar chart showing story points committed vs completed per sprint.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: david, epic: epicReports, status: doneStatus },
    { title: 'Fix sprint date validation', desc: 'Sprint end date can be set before start date. Add Zod validation on both frontend and backend.', type: 'BUG' as const, priority: 'HIGH' as const, assignee: james, epic: epicSprint, status: doneStatus },
    { title: 'Scrum board empty state', desc: 'Show helpful empty state when a sprint has no issues, with a link to the backlog.', type: 'TASK' as const, priority: 'LOW' as const, assignee: emily, epic: epicSprint, status: doneStatus },
    { title: 'Issue linking (blocks / relates to)', desc: 'API + UI for linking issues as "blocks", "is blocked by", "relates to", or "duplicates".', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: alex, epic: epicBoard, status: doneStatus },
  ];

  for (let i = 0; i < s3Issues.length; i++) {
    await createIssue({
      title: s3Issues[i].title, description: s3Issues[i].desc,
      type: s3Issues[i].type, priority: s3Issues[i].priority,
      statusId: s3Issues[i].status.id, assigneeId: s3Issues[i].assignee.id,
      reporterId: randomItem([vikram, sarah]).id,
      sprintId: sprint3.id, epicId: s3Issues[i].epic.id,
      createdAt: daysAgo(28 - i),
    });
  }

  console.log(`Sprint 3: ${s3Issues.length} issues (all Done)`);

  // ═══════════════════════════════════════════════════════════════════════
  // SPRINT 4 — "Collaboration & Polish" (ACTIVE, started 1 day ago)
  // ═══════════════════════════════════════════════════════════════════════
  const sprint4 = await prisma.sprint.create({
    data: {
      name: 'Sprint 4 — Collaboration & Polish',
      goal: 'Real-time notifications, file attachments, search, settings, and performance',
      startDate: daysAgo(14),
      endDate: daysFromNow(0),
      status: 'ACTIVE',
      projectId: project.id,
    },
  });

  const s4Issues = [
    { title: 'Socket.io real-time notifications', desc: 'Set up Socket.io server, connect after login, emit events for assignments, comments, status changes.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: alex, epic: epicNotifications, status: doneStatus },
    { title: 'In-app notification center', desc: 'Bell icon in navbar with unread count badge. Dropdown panel listing recent notifications with mark-as-read.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: emily, epic: epicNotifications, status: doneStatus },
    { title: 'File attachment upload & display', desc: 'Multer-based file upload on issues. Display attachments with download links and delete option.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: maria, epic: epicNotifications, status: doneStatus },
    { title: 'Global search across issues & projects', desc: 'Search endpoint with query param. Frontend debounced search dropdown with issue results.', type: 'STORY' as const, priority: 'HIGH' as const, assignee: raj, epic: epicNotifications, status: inReviewStatus },
    { title: 'Advanced issue filters (save & load)', desc: 'Filter panel with status, priority, type, assignee, date range. Save custom filter presets.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: priya, epic: epicNotifications, status: inProgressStatus },
    { title: 'User settings page (profile & avatar)', desc: 'Settings page for editing name, email, avatar upload, password change, and notification preferences.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: emily, epic: epicNotifications, status: inProgressStatus },
    { title: 'Team workload report', desc: 'Horizontal bar chart showing issue count per assignee, grouped by status.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: david, epic: epicReports, status: inProgressStatus },
    { title: 'Cumulative flow diagram', desc: 'Area chart showing issue count per status over time for the project.', type: 'STORY' as const, priority: 'LOW' as const, assignee: david, epic: epicReports, status: todoStatus },
    { title: 'Email notification digests', desc: 'Daily email summary of new assignments, comments, and approaching due dates using Nodemailer.', type: 'STORY' as const, priority: 'LOW' as const, assignee: alex, epic: epicNotifications, status: todoStatus },
    { title: 'My Issues page with filters', desc: 'Page showing all issues assigned to current user with search, priority, and status filters.', type: 'TASK' as const, priority: 'MEDIUM' as const, assignee: raj, epic: epicNotifications, status: doneStatus },
    { title: 'Fix notification badge not clearing', desc: 'Unread count badge does not update after marking all as read. Cache invalidation missing.', type: 'BUG' as const, priority: 'HIGH' as const, assignee: alex, epic: epicNotifications, status: inReviewStatus },
    { title: 'Performance: lazy-load route chunks', desc: 'Code-split pages with React.lazy() + Suspense to reduce initial bundle from 1MB to <500KB.', type: 'TASK' as const, priority: 'HIGH' as const, assignee: priya, epic: epicNotifications, status: doneStatus },
    { title: 'Audit log viewer for admins', desc: 'Settings sub-page showing recent activity across the workspace with filtering.', type: 'STORY' as const, priority: 'LOW' as const, assignee: james, epic: epicNotifications, status: todoStatus },
    { title: 'Keyboard shortcuts for board', desc: 'Add keyboard shortcuts: N for new issue, / for search, arrow keys for board navigation.', type: 'TASK' as const, priority: 'LOW' as const, assignee: maria, epic: epicBoard, status: todoStatus },
  ];

  for (let i = 0; i < s4Issues.length; i++) {
    await createIssue({
      title: s4Issues[i].title, description: s4Issues[i].desc,
      type: s4Issues[i].type, priority: s4Issues[i].priority,
      statusId: s4Issues[i].status.id, assigneeId: s4Issues[i].assignee.id,
      reporterId: randomItem([vikram, sarah]).id,
      sprintId: sprint4.id, epicId: s4Issues[i].epic.id,
      createdAt: daysAgo(14 - i),
    });
  }

  console.log(`Sprint 4: ${s4Issues.length} issues (mixed statuses — active sprint)`);

  // ═══════════════════════════════════════════════════════════════════════
  // BACKLOG — unassigned to any sprint
  // ═══════════════════════════════════════════════════════════════════════
  const backlogItems = [
    { title: 'Dark mode toggle', desc: 'Add dark mode support with system preference detection and manual toggle in settings.', type: 'STORY' as const, priority: 'LOW' as const, assignee: emily },
    { title: 'Webhook integrations (GitHub, Slack)', desc: 'Outgoing webhooks for issue events. Incoming webhook for GitHub PR status updates.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: undefined },
    { title: 'Mobile-responsive board layout', desc: 'Board columns should stack vertically on mobile. Swipe between columns on touch devices.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: undefined },
    { title: 'CSV/Excel export for issues', desc: 'Export filtered issue lists to CSV. Include all fields: title, status, priority, assignee, dates.', type: 'TASK' as const, priority: 'LOW' as const, assignee: undefined },
    { title: 'Two-factor authentication', desc: 'TOTP-based 2FA for user accounts. QR code setup flow with backup codes.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: undefined },
    { title: 'Project templates', desc: 'Predefined project templates (Bug Tracker, Feature Dev, Sprint Board) with default statuses and issue types.', type: 'STORY' as const, priority: 'LOW' as const, assignee: undefined },
    { title: 'Gantt chart for epics', desc: 'Timeline/Gantt view showing epic durations, dependencies, and progress bars.', type: 'STORY' as const, priority: 'MEDIUM' as const, assignee: david },
    { title: 'Archive completed projects', desc: 'Allow archiving old projects. Archived projects hidden from main list but accessible via filter.', type: 'TASK' as const, priority: 'LOW' as const, assignee: undefined },
  ];

  for (let i = 0; i < backlogItems.length; i++) {
    await createIssue({
      title: backlogItems[i].title, description: backlogItems[i].desc,
      type: backlogItems[i].type, priority: backlogItems[i].priority,
      statusId: todoStatus.id, assigneeId: backlogItems[i].assignee?.id,
      reporterId: randomItem([vikram, sarah, alex]).id,
      createdAt: daysAgo(7 - i),
    });
  }

  console.log(`Backlog: ${backlogItems.length} items`);

  // ─── Create comments across issues ────────────────────────────────────
  const commentData = [
    // Sprint 1 comments
    { issueIdx: 5, content: 'JWT implementation looks solid. Added httpOnly cookie for the refresh token.', author: alex, createdAt: daysAgo(52) },
    { issueIdx: 5, content: 'Tested with Postman — token rotation works. LGTM for merge.', author: sarah, createdAt: daysAgo(51) },
    { issueIdx: 7, content: 'Using React Hook Form + Zod for the registration form. Validation is really clean.', author: priya, createdAt: daysAgo(50) },
    { issueIdx: 9, content: 'Sidebar collapse animation done. Using framer-motion for smooth transitions.', author: emily, createdAt: daysAgo(48) },
    { issueIdx: 15, content: 'The CORS issue was caused by credentials: "include" not being set on axios. Fixed in api.ts.', author: alex, createdAt: daysAgo(45) },
    // Sprint 2 comments
    { issueIdx: 17, content: '@priya The DnD feels smooth now. Cross-column moves update the cache instantly.', author: raj, createdAt: daysAgo(38) },
    { issueIdx: 19, content: 'Using DragOverEvent to detect when an item enters a new column. Works great with @dnd-kit.', author: priya, createdAt: daysAgo(37) },
    { issueIdx: 19, content: 'Added rollback on API failure — if the PATCH fails, the card snaps back to original position.', author: priya, createdAt: daysAgo(36) },
    { issueIdx: 21, content: 'Tiptap is much lighter than Draft.js. Editor loads in <100ms.', author: emily, createdAt: daysAgo(35) },
    { issueIdx: 22, content: '@mention autocomplete triggers on @ keypress. Filters users as you type.', author: maria, createdAt: daysAgo(34) },
    { issueIdx: 24, content: 'Issue card overflow on mobile is fixed. Using line-clamp-2 for truncation.', author: emily, createdAt: daysAgo(33) },
    // Sprint 3 comments
    { issueIdx: 30, content: 'Sprint start validates that no other sprint is active. Clean error messages.', author: james, createdAt: daysAgo(24) },
    { issueIdx: 31, content: 'Backlog drag-to-prioritize uses sortable from @dnd-kit/sortable. Feels natural.', author: priya, createdAt: daysAgo(23) },
    { issueIdx: 35, content: 'Burndown data is calculated server-side. Ideal line is based on sprint duration / total points.', author: david, createdAt: daysAgo(20) },
    { issueIdx: 35, content: 'Added a tooltip on hover showing exact remaining items for each day.', author: david, createdAt: daysAgo(19) },
    { issueIdx: 36, content: 'Velocity chart shows last 5 sprints by default. Can expand to show all.', author: david, createdAt: daysAgo(18) },
    // Sprint 4 comments
    { issueIdx: 39, content: 'Socket.io connected on login, disconnected on logout. Using rooms per project for scoped events.', author: alex, createdAt: daysAgo(12) },
    { issueIdx: 40, content: 'Notification dropdown shows max 10 recent items. "View all" links to a full page.', author: emily, createdAt: daysAgo(10) },
    { issueIdx: 42, content: 'Search debounced at 300ms. Results grouped by type (issues, projects).', author: raj, createdAt: daysAgo(6) },
    { issueIdx: 42, content: '@sarah Should we add user search results too?', author: raj, createdAt: daysAgo(5) },
    { issueIdx: 42, content: '@raj Yes, add user results. Show name + email in the dropdown.', author: sarah, createdAt: daysAgo(5) },
    { issueIdx: 49, content: 'Notification count badge now invalidates cache after markAllAsRead mutation.', author: alex, createdAt: daysAgo(3) },
    { issueIdx: 50, content: 'Code splitting reduced main chunk from ~1MB to 436KB. 14 lazy-loaded route chunks.', author: priya, createdAt: daysAgo(2) },
  ];

  for (const c of commentData) {
    if (allIssues[c.issueIdx]) {
      await prisma.comment.create({
        data: {
          content: c.content,
          issueId: allIssues[c.issueIdx].id,
          authorId: c.author.id,
          createdAt: c.createdAt,
        },
      });
    }
  }

  console.log(`Created ${commentData.length} comments`);

  // ─── Create activity logs ─────────────────────────────────────────────
  const activityEntries: Array<{
    action: string; field?: string; oldValue?: string | null; newValue?: string;
    issueIdx: number; userId: string; createdAt: Date;
  }> = [];

  // Generate activity for all issues
  for (let i = 5; i < allIssues.length; i++) {
    const issue = allIssues[i];
    if (!issue) continue;
    const reporter = randomItem([vikram, sarah, ...devs]);

    activityEntries.push({
      action: 'CREATED', issueIdx: i, userId: reporter.id,
      createdAt: daysAgo(56 - Math.floor(i / 2)),
    });

    // Issues in Done status went through transitions
    if (i < 39) { // Sprint 1-3 issues are all done
      activityEntries.push({
        action: 'UPDATED', field: 'status', oldValue: 'To Do', newValue: 'In Progress',
        issueIdx: i, userId: randomItem(devs).id,
        createdAt: daysAgo(54 - Math.floor(i / 2)),
      });
      activityEntries.push({
        action: 'UPDATED', field: 'status', oldValue: 'In Progress', newValue: 'In Review',
        issueIdx: i, userId: randomItem(devs).id,
        createdAt: daysAgo(52 - Math.floor(i / 2)),
      });
      activityEntries.push({
        action: 'UPDATED', field: 'status', oldValue: 'In Review', newValue: 'Done',
        issueIdx: i, userId: randomItem([sarah, vikram]).id,
        createdAt: daysAgo(50 - Math.floor(i / 2)),
      });
    }
  }

  for (const a of activityEntries) {
    if (allIssues[a.issueIdx]) {
      await prisma.activityLog.create({
        data: {
          action: a.action,
          field: a.field,
          oldValue: a.oldValue,
          newValue: a.newValue,
          issueId: allIssues[a.issueIdx].id,
          userId: a.userId,
          createdAt: a.createdAt,
        },
      });
    }
  }

  console.log(`Created ${activityEntries.length} activity log entries`);

  // ─── Create notifications for current user ────────────────────────────
  const notificationData = [
    { type: 'ASSIGNED' as const, message: 'You were assigned to "Advanced issue filters (save & load)"', userId: priya.id, issueIdx: 43 },
    { type: 'COMMENT' as const, message: 'Sarah commented on "Global search across issues & projects"', userId: raj.id, issueIdx: 42 },
    { type: 'STATUS_CHANGED' as const, message: '"My Issues page with filters" was moved to Done', userId: raj.id, issueIdx: 48 },
    { type: 'ASSIGNED' as const, message: 'You were assigned to "Team workload report"', userId: david.id, issueIdx: 45 },
    { type: 'COMMENT' as const, message: 'Raj asked: "Should we add user search results too?"', userId: sarah.id, issueIdx: 42 },
    { type: 'MENTIONED' as const, message: 'Raj mentioned you in "Global search across issues & projects"', userId: sarah.id, issueIdx: 42 },
    { type: 'ASSIGNED' as const, message: 'You were assigned to "Socket.io real-time notifications"', userId: alex.id, issueIdx: 39 },
    { type: 'STATUS_CHANGED' as const, message: '"Performance: lazy-load route chunks" was moved to Done', userId: priya.id, issueIdx: 50 },
    { type: 'COMMENT' as const, message: 'Alex commented on "Fix notification badge not clearing"', userId: vikram.id, issueIdx: 49 },
    { type: 'DUE_DATE' as const, message: '"Cumulative flow diagram" is due in 3 days', userId: david.id, issueIdx: 46 },
  ];

  for (let i = 0; i < notificationData.length; i++) {
    const n = notificationData[i];
    if (allIssues[n.issueIdx]) {
      await prisma.notification.create({
        data: {
          type: n.type,
          message: n.message,
          userId: n.userId,
          issueId: allIssues[n.issueIdx].id,
          read: i < 4, // first 4 read, rest unread
          createdAt: daysAgo(10 - i),
        },
      });
    }
  }

  console.log(`Created ${notificationData.length} notifications`);

  // ─── Labels ─────────────────────────────────────────────────────────────
  const labelData = [
    { name: 'frontend', color: '#3B82F6', projectId: project.id },
    { name: 'backend', color: '#10B981', projectId: project.id },
    { name: 'api', color: '#8B5CF6', projectId: project.id },
    { name: 'database', color: '#F59E0B', projectId: project.id },
    { name: 'security', color: '#EF4444', projectId: project.id },
    { name: 'performance', color: '#EC4899', projectId: project.id },
    { name: 'ux', color: '#06B6D4', projectId: project.id },
    { name: 'documentation', color: '#6B7280', projectId: project.id },
    { name: 'testing', color: '#14B8A6', projectId: project.id },
  ];

  const createdLabels = await Promise.all(
    labelData.map((l) => prisma.label.create({ data: l }))
  );
  console.log(`Created ${createdLabels.length} labels`);

  // ─── Story Points (update existing issues) ────────────────────────────
  const spValues = [0.5, 1, 2, 3, 5, 8, 13];
  const estValues = [1, 2, 4, 6, 8, 12, 16];
  for (let i = 0; i < allIssues.length; i++) {
    const sp = spValues[i % spValues.length];
    const est = estValues[i % estValues.length];
    const spent = Math.min(est, Math.round(est * (Math.random() * 0.8 + 0.1) * 10) / 10);
    await prisma.issue.update({
      where: { id: allIssues[i].id },
      data: {
        storyPoints: sp,
        estimate: est,
        timeSpent: i < allIssues.length * 0.6 ? spent : 0,
      },
    });
  }
  console.log(`Updated ${allIssues.length} issues with story points and estimates`);

  // ─── Issue Labels (assign labels to issues) ───────────────────────────
  const issueLabelPairs: { issueId: string; labelId: string }[] = [];
  for (let i = 0; i < allIssues.length; i++) {
    // Each issue gets 1-3 labels
    const numLabels = 1 + (i % 3);
    for (let j = 0; j < numLabels; j++) {
      const label = createdLabels[(i + j) % createdLabels.length];
      issueLabelPairs.push({ issueId: allIssues[i].id, labelId: label.id });
    }
  }
  await prisma.issueLabel.createMany({
    data: issueLabelPairs,
    skipDuplicates: true,
  });
  console.log(`Created ${issueLabelPairs.length} issue-label associations`);

  // ─── Issue Links ──────────────────────────────────────────────────────
  const linkTypes = ['BLOCKS', 'RELATES_TO', 'DUPLICATES'] as const;
  const issueLinkData: { type: string; sourceIssueId: string; targetIssueId: string }[] = [];
  for (let i = 0; i < Math.min(15, allIssues.length - 1); i++) {
    const targetIdx = (i + 3) % allIssues.length;
    if (targetIdx !== i) {
      issueLinkData.push({
        type: linkTypes[i % linkTypes.length],
        sourceIssueId: allIssues[i].id,
        targetIssueId: allIssues[targetIdx].id,
      });
    }
  }
  await prisma.issueLink.createMany({
    data: issueLinkData,
    skipDuplicates: true,
  });
  console.log(`Created ${issueLinkData.length} issue links`);

  // ─── Watchers ─────────────────────────────────────────────────────────
  const watcherData: { userId: string; issueId: string }[] = [];
  for (let i = 0; i < Math.min(20, allIssues.length); i++) {
    // Reporter watches their own issue
    watcherData.push({ userId: allIssues[i].reporterId, issueId: allIssues[i].id });
    // Add 1-2 random watchers
    const watcher1 = users[(i + 2) % users.length];
    if (watcher1.id !== allIssues[i].reporterId) {
      watcherData.push({ userId: watcher1.id, issueId: allIssues[i].id });
    }
  }
  await prisma.watcher.createMany({
    data: watcherData,
    skipDuplicates: true,
  });
  console.log(`Created ${watcherData.length} watchers`);

  // ─── Time Logs ────────────────────────────────────────────────────────
  const timeLogData: { hours: number; description: string; issueId: string; userId: string; loggedAt: Date }[] = [];
  for (let i = 0; i < Math.min(30, allIssues.length); i++) {
    const issue = allIssues[i];
    const logUser = issue.assigneeId ?? issue.reporterId;
    const hours = [0.5, 1, 1.5, 2, 3, 4][i % 6];
    const descriptions = [
      'Code review and fixes',
      'Implementation work',
      'Testing and debugging',
      'Documentation updates',
      'Design review',
      'Pair programming session',
    ];
    timeLogData.push({
      hours,
      description: descriptions[i % descriptions.length],
      issueId: issue.id,
      userId: logUser,
      loggedAt: daysAgo(Math.floor(Math.random() * 14)),
    });
  }
  await prisma.timeLog.createMany({ data: timeLogData });
  console.log(`Created ${timeLogData.length} time logs`);

  // ─── Summary ──────────────────────────────────────────────────────────
  const totalIssues = allIssues.length;
  console.log('\n═══════════════════════════════════════════');
  console.log('  Seed completed successfully!');
  console.log('═══════════════════════════════════════════');
  console.log(`  Team members:    ${users.length}`);
  console.log(`  Workspace:       ${workspace.name}`);
  console.log(`  Project:         ${project.name} (Scrum)`);
  console.log(`  Sprints:         3 completed + 1 active`);
  console.log(`  Epics:           5`);
  console.log(`  Total issues:    ${totalIssues}`);
  console.log(`  Comments:        ${commentData.length}`);
  console.log(`  Labels:          ${createdLabels.length}`);
  console.log(`  Issue links:     ${issueLinkData.length}`);
  console.log(`  Watchers:        ${watcherData.length}`);
  console.log(`  Time logs:       ${timeLogData.length}`);
  console.log(`  Notifications:   ${notificationData.length}`);
  console.log('───────────────────────────────────────────');
  console.log('  Login credentials (all users):');
  console.log('    Password: password123');
  console.log('');
  console.log('  Admin:   vikram@trackly.com');
  console.log('  PM:      sarah@trackly.com');
  console.log('  Devs:    alex@trackly.com, priya@trackly.com');
  console.log('           james@trackly.com, emily@trackly.com');
  console.log('           raj@trackly.com, maria@trackly.com');
  console.log('           david@trackly.com');
  console.log('  Viewer:  lisa@trackly.com');
  console.log('═══════════════════════════════════════════');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
