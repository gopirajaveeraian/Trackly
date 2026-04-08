import type { Issue } from '@/types';
import { IssueType, Priority } from '@/types';
import { PROJECT_TRK_ID, PROJECT_DS_ID } from './projects';
import { statuses } from './statuses';
import { users } from './users';

const s = (id: string) => statuses.find((s) => s.id === id)!;
const u = (id: string) => users.find((u) => u.id === id)!;

// ─── Trackly App Issues (TRK) ──────────────────────────────────────────────

const trkIssues: Issue[] = [
  // ── Epics ──
  {
    id: 'iss-001', title: 'User Authentication & Authorization', description: '<p>Implement complete auth flow including JWT login, registration, role-based access, and password reset.</p>', type: IssueType.EPIC, priority: Priority.HIGH, number: 1, storyPoints: null, estimate: null, timeSpent: null,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-001', assignee: u('usr-001'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null, subTasks: [], labels: [], links: [], watchers: [], timeLogs: [],
    order: 1,
    dueDate: null, createdAt: '2025-10-02T09:00:00.000Z', updatedAt: '2026-02-28T16:00:00.000Z',
  },
  {
    id: 'iss-002', title: 'Board View & Drag-and-Drop', description: '<p>Build Kanban and Scrum board views with drag-and-drop issue management using @dnd-kit.</p>', type: IssueType.EPIC, priority: Priority.HIGH, number: 2, storyPoints: null, estimate: null, timeSpent: null,
    statusId: 'st-trk-2', status: s('st-trk-2'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null, subTasks: [], labels: [], links: [], watchers: [], timeLogs: [],
    order: 2,
    dueDate: '2026-03-28T00:00:00.000Z', createdAt: '2025-10-02T09:30:00.000Z', updatedAt: '2026-03-10T14:00:00.000Z',
  },

  // ── Sprint 1 issues (all Done) ──
  {
    id: 'iss-003', title: 'Set up JWT authentication middleware', description: '<p>Implement Express middleware for JWT verification with access/refresh token flow.</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 3, storyPoints: 5, estimate: 8, timeSpent: 7,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-001', assignee: u('usr-001'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: 'iss-001', epic: { id: 'iss-001', title: 'User Authentication & Authorization', number: 1 },
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 3,
    dueDate: null, createdAt: '2026-02-17T09:00:00.000Z', updatedAt: '2026-02-20T17:00:00.000Z',
  },
  {
    id: 'iss-004', title: 'Create login and registration pages', description: '<p>Build login and registration forms with validation using React Hook Form + Zod.</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 4, storyPoints: 3, estimate: 6, timeSpent: 5,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: 'iss-001', epic: { id: 'iss-001', title: 'User Authentication & Authorization', number: 1 },
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 4,
    dueDate: null, createdAt: '2026-02-17T10:00:00.000Z', updatedAt: '2026-02-21T16:00:00.000Z',
  },
  {
    id: 'iss-005', title: 'Set up Prisma schema and initial migration', description: '<p>Define all core database models and run the initial migration against PostgreSQL.</p>', type: IssueType.TASK, priority: Priority.CRITICAL, number: 5, storyPoints: 3, estimate: 4, timeSpent: 3,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-001', assignee: u('usr-001'), reporterId: 'usr-001', reporter: u('usr-001'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 5,
    dueDate: null, createdAt: '2026-02-17T08:00:00.000Z', updatedAt: '2026-02-18T15:00:00.000Z',
  },
  {
    id: 'iss-006', title: 'Build app layout with sidebar navigation', description: '<p>Create the main application shell with collapsible sidebar, top navbar, and responsive layout.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 6, storyPoints: 5, estimate: 8, timeSpent: 9,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }, { id: 'lbl-004', name: 'ux', color: '#8B5CF6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 6,
    dueDate: null, createdAt: '2026-02-18T09:00:00.000Z', updatedAt: '2026-02-25T17:00:00.000Z',
  },
  {
    id: 'iss-007', title: 'Implement workspace and project CRUD APIs', description: '<p>Build REST endpoints for workspace management and project CRUD operations.</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 7, storyPoints: 5, estimate: 6, timeSpent: 6,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 7,
    dueDate: null, createdAt: '2026-02-19T09:00:00.000Z', updatedAt: '2026-02-26T16:00:00.000Z',
  },
  {
    id: 'iss-008', title: 'Create seed script with sample data', description: '<p>Write a Prisma seed script that populates the database with realistic demo data.</p>', type: IssueType.TASK, priority: Priority.LOW, number: 8, storyPoints: 2, estimate: 3, timeSpent: 3,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-001', reporter: u('usr-001'),
    sprintId: 'spr-001', sprint: { id: 'spr-001', name: 'Sprint 1 — Foundation', status: 'COMPLETED' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 8,
    dueDate: null, createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-02-27T12:00:00.000Z',
  },

  // ── Sprint 2 issues (Active — mixed statuses) ──
  {
    id: 'iss-009', title: 'Implement Kanban board with drag-and-drop columns', description: '<p>Build the Kanban board page using @dnd-kit. Issues should be draggable between status columns with optimistic UI updates. Include WIP limits per column.</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 9, storyPoints: 8, estimate: 12, timeSpent: 6,
    statusId: 'st-trk-2', status: s('st-trk-2'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: 'iss-002', epic: { id: 'iss-002', title: 'Board View & Drag-and-Drop', number: 2 },
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 9,
    dueDate: '2026-03-12T00:00:00.000Z', createdAt: '2026-03-03T09:00:00.000Z', updatedAt: '2026-03-11T16:00:00.000Z',
  },
  {
    id: 'iss-010', title: 'Build issue detail page with sidebar', description: '<p>Create the full issue detail view with editable fields, activity log, comments section, and metadata sidebar (assignee, priority, labels, sprint, etc).</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 10, storyPoints: 8, estimate: 10, timeSpent: 8,
    statusId: 'st-trk-3', status: s('st-trk-3'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: 'iss-002', epic: { id: 'iss-002', title: 'Board View & Drag-and-Drop', number: 2 },
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }, { id: 'lbl-004', name: 'ux', color: '#8B5CF6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 10,
    dueDate: '2026-03-14T00:00:00.000Z', createdAt: '2026-03-03T10:00:00.000Z', updatedAt: '2026-03-13T10:00:00.000Z',
  },
  {
    id: 'iss-011', title: 'Issue CRUD API endpoints', description: '<p>Implement REST endpoints for creating, reading, updating, and deleting issues with full validation.</p>', type: IssueType.STORY, priority: Priority.HIGH, number: 11, storyPoints: 5, estimate: 8, timeSpent: 8,
    statusId: 'st-trk-4', status: s('st-trk-4'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-001', assignee: u('usr-001'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 11,
    dueDate: null, createdAt: '2026-03-03T11:00:00.000Z', updatedAt: '2026-03-10T16:00:00.000Z',
  },
  {
    id: 'iss-012', title: 'Fix login form not clearing errors on retry', description: '<p>When a user submits invalid credentials and then corrects them, the error banner persists until the page is refreshed. It should clear when the form is resubmitted.</p>', type: IssueType.BUG, priority: Priority.MEDIUM, number: 12, storyPoints: 1, estimate: 2, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-003', reporter: u('usr-003'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: 'iss-001', epic: { id: 'iss-001', title: 'User Authentication & Authorization', number: 1 },
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 12,
    dueDate: null, createdAt: '2026-03-05T14:00:00.000Z', updatedAt: '2026-03-05T14:00:00.000Z',
  },
  {
    id: 'iss-013', title: 'Add sprint management UI', description: '<p>Build sprint list page, sprint creation modal, and start/complete sprint workflows.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 13, storyPoints: 5, estimate: 8, timeSpent: 3,
    statusId: 'st-trk-2', status: s('st-trk-2'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 13,
    dueDate: '2026-03-14T00:00:00.000Z', createdAt: '2026-03-04T09:00:00.000Z', updatedAt: '2026-03-12T11:00:00.000Z',
  },
  {
    id: 'iss-014', title: 'Implement backlog view with drag-to-reorder', description: '<p>Build the backlog page showing all unassigned issues with drag-and-drop prioritization and bulk move to sprint.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 14, storyPoints: 5, estimate: 8, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: 'iss-002', epic: { id: 'iss-002', title: 'Board View & Drag-and-Drop', number: 2 },
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 14,
    dueDate: null, createdAt: '2026-03-04T10:00:00.000Z', updatedAt: '2026-03-04T10:00:00.000Z',
  },
  {
    id: 'iss-015', title: 'API response times degraded after adding issue filters', description: '<p>The GET /issues endpoint is taking 800ms+ when filters are applied. Need to add database indexes and optimize the query builder.</p>', type: IssueType.BUG, priority: Priority.HIGH, number: 15, storyPoints: 3, estimate: 4, timeSpent: 2,
    statusId: 'st-trk-2', status: s('st-trk-2'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: 'usr-001', assignee: u('usr-001'), reporterId: 'usr-001', reporter: u('usr-001'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }, { id: 'lbl-005', name: 'performance', color: '#F59E0B', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 15,
    dueDate: '2026-03-10T00:00:00.000Z', createdAt: '2026-03-06T15:00:00.000Z', updatedAt: '2026-03-11T09:00:00.000Z',
  },
  {
    id: 'iss-016', title: 'Add comments and @mentions to issue detail', description: '<p>Implement comment thread on issue detail with @mention autocomplete for team members.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 16, storyPoints: 5, estimate: 6, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: 'spr-002', sprint: { id: 'spr-002', name: 'Sprint 2 — Core Features', status: 'ACTIVE' },
    epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 16,
    dueDate: null, createdAt: '2026-03-05T09:00:00.000Z', updatedAt: '2026-03-05T09:00:00.000Z',
  },

  // ── Backlog issues (no sprint) ──
  {
    id: 'iss-017', title: 'Implement real-time notifications with Socket.io', description: '<p>Set up Socket.io on server and client for push notifications when issues are assigned, commented, or status-changed.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 17, storyPoints: 8, estimate: 12, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }, { id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 17,
    dueDate: null, createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'iss-018', title: 'Build burndown and velocity charts', description: '<p>Create reporting page with burndown chart for active sprint and velocity chart showing story points completed across sprints using Recharts.</p>', type: IssueType.STORY, priority: Priority.LOW, number: 18, storyPoints: 5, estimate: 8, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 18,
    dueDate: null, createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'iss-019', title: 'Add global search with keyboard shortcut', description: '<p>Implement Cmd+K search modal that searches across issues, projects, and users.</p>', type: IssueType.STORY, priority: Priority.LOW, number: 19, storyPoints: 5, estimate: 6, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: null, assignee: null, reporterId: 'usr-001', reporter: u('usr-001'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-001', name: 'frontend', color: '#3B82F6', projectId: PROJECT_TRK_ID }, { id: 'lbl-004', name: 'ux', color: '#8B5CF6', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 19,
    dueDate: null, createdAt: '2026-03-02T09:00:00.000Z', updatedAt: '2026-03-02T09:00:00.000Z',
  },
  {
    id: 'iss-020', title: 'Refactor API error handling to centralized middleware', description: '<p>Current error handling is inconsistent across controllers. Consolidate into a single error handling middleware with proper error codes.</p>', type: IssueType.TASK, priority: Priority.LOW, number: 20, storyPoints: 3, estimate: 4, timeSpent: null,
    statusId: 'st-trk-1', status: s('st-trk-1'), projectId: PROJECT_TRK_ID, project: { id: PROJECT_TRK_ID, name: 'Trackly App', key: 'TRK' },
    assigneeId: null, assignee: null, reporterId: 'usr-001', reporter: u('usr-001'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-002', name: 'backend', color: '#10B981', projectId: PROJECT_TRK_ID }, { id: 'lbl-006', name: 'tech-debt', color: '#6B7280', projectId: PROJECT_TRK_ID }], links: [], watchers: [], timeLogs: [],
    order: 20,
    dueDate: null, createdAt: '2026-03-02T11:00:00.000Z', updatedAt: '2026-03-02T11:00:00.000Z',
  },
];

// ─── Design System Issues (DS) ──────────────────────────────────────────────

const dsIssues: Issue[] = [
  {
    id: 'iss-101', title: 'Create Button component with variants', description: '<p>Build a Button component supporting primary, secondary, ghost, and destructive variants with size options (sm, md, lg).</p>', type: IssueType.TASK, priority: Priority.HIGH, number: 1, storyPoints: 3, estimate: 4, timeSpent: 4,
    statusId: 'st-ds-4', status: s('st-ds-4'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 21,
    dueDate: null, createdAt: '2025-10-15T09:00:00.000Z', updatedAt: '2025-11-01T16:00:00.000Z',
  },
  {
    id: 'iss-102', title: 'Design color token system', description: '<p>Define a comprehensive color token system with semantic naming (primary, secondary, success, warning, error) supporting light and dark themes.</p>', type: IssueType.TASK, priority: Priority.HIGH, number: 2, storyPoints: 5, estimate: 6, timeSpent: 5,
    statusId: 'st-ds-4', status: s('st-ds-4'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-002', assignee: u('usr-002'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-102', name: 'tokens', color: '#8B5CF6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 22,
    dueDate: null, createdAt: '2025-10-15T10:00:00.000Z', updatedAt: '2025-10-28T15:00:00.000Z',
  },
  {
    id: 'iss-103', title: 'Build Modal and Dialog components', description: '<p>Create accessible modal/dialog with focus trapping, Escape key handling, and backdrop click dismissal.</p>', type: IssueType.TASK, priority: Priority.MEDIUM, number: 3, storyPoints: 5, estimate: 6, timeSpent: 3,
    statusId: 'st-ds-3', status: s('st-ds-3'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-004', assignee: u('usr-004'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }, { id: 'lbl-104', name: 'a11y', color: '#10B981', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 23,
    dueDate: null, createdAt: '2025-11-05T09:00:00.000Z', updatedAt: '2026-03-12T14:00:00.000Z',
  },
  {
    id: 'iss-104', title: 'Create form input components (Input, Select, Checkbox)', description: '<p>Build form input primitives with consistent styling, error states, and label placement.</p>', type: IssueType.TASK, priority: Priority.MEDIUM, number: 4, storyPoints: 5, estimate: 8, timeSpent: 4,
    statusId: 'st-ds-2', status: s('st-ds-2'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 24,
    dueDate: '2026-03-20T00:00:00.000Z', createdAt: '2025-11-10T09:00:00.000Z', updatedAt: '2026-03-13T11:00:00.000Z',
  },
  {
    id: 'iss-105', title: 'Add typography scale and font tokens', description: '<p>Define type scale with font sizes, line heights, and font weights. Create utility classes for headings, body, captions.</p>', type: IssueType.TASK, priority: Priority.MEDIUM, number: 5, storyPoints: 3, estimate: 4, timeSpent: null,
    statusId: 'st-ds-2', status: s('st-ds-2'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-002', assignee: u('usr-002'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-102', name: 'tokens', color: '#8B5CF6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 25,
    dueDate: null, createdAt: '2025-11-12T09:00:00.000Z', updatedAt: '2026-03-10T10:00:00.000Z',
  },
  {
    id: 'iss-106', title: 'Build Table component with sorting and pagination', description: '<p>Create a data table component with sortable columns, pagination controls, and row selection.</p>', type: IssueType.TASK, priority: Priority.LOW, number: 6, storyPoints: 8, estimate: 10, timeSpent: null,
    statusId: 'st-ds-1', status: s('st-ds-1'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 26,
    dueDate: null, createdAt: '2025-11-15T09:00:00.000Z', updatedAt: '2025-11-15T09:00:00.000Z',
  },
  {
    id: 'iss-107', title: 'Write Storybook documentation for Button and Modal', description: '<p>Add Storybook stories with interactive examples for all Button variants and Modal configurations.</p>', type: IssueType.TASK, priority: Priority.LOW, number: 7, storyPoints: 3, estimate: 4, timeSpent: null,
    statusId: 'st-ds-1', status: s('st-ds-1'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-103', name: 'docs', color: '#F59E0B', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 27,
    dueDate: null, createdAt: '2025-11-20T09:00:00.000Z', updatedAt: '2025-11-20T09:00:00.000Z',
  },
  {
    id: 'iss-108', title: 'Audit all components for WCAG 2.1 AA compliance', description: '<p>Run accessibility audit on every component. Ensure proper ARIA attributes, keyboard navigation, and color contrast ratios.</p>', type: IssueType.TASK, priority: Priority.MEDIUM, number: 8, storyPoints: 5, estimate: 6, timeSpent: null,
    statusId: 'st-ds-1', status: s('st-ds-1'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: null, assignee: null, reporterId: 'usr-004', reporter: u('usr-004'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-104', name: 'a11y', color: '#10B981', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 28,
    dueDate: null, createdAt: '2025-12-01T09:00:00.000Z', updatedAt: '2025-12-01T09:00:00.000Z',
  },
  {
    id: 'iss-109', title: 'Create Toast notification component', description: '<p>Build a toast/snackbar component for transient messages with auto-dismiss, stacking, and action buttons.</p>', type: IssueType.TASK, priority: Priority.LOW, number: 9, storyPoints: 3, estimate: 4, timeSpent: 2,
    statusId: 'st-ds-3', status: s('st-ds-3'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: 'usr-003', assignee: u('usr-003'), reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 29,
    dueDate: null, createdAt: '2026-01-10T09:00:00.000Z', updatedAt: '2026-03-14T10:00:00.000Z',
  },
  {
    id: 'iss-110', title: 'Add dark mode support to all components', description: '<p>Ensure all components respect the dark mode token system and transition smoothly between themes.</p>', type: IssueType.STORY, priority: Priority.MEDIUM, number: 10, storyPoints: 5, estimate: 8, timeSpent: null,
    statusId: 'st-ds-1', status: s('st-ds-1'), projectId: PROJECT_DS_ID, project: { id: PROJECT_DS_ID, name: 'Design System', key: 'DS' },
    assigneeId: null, assignee: null, reporterId: 'usr-002', reporter: u('usr-002'),
    sprintId: null, sprint: null, epicId: null, epic: null,
    subTasks: [], labels: [{ id: 'lbl-102', name: 'tokens', color: '#8B5CF6', projectId: PROJECT_DS_ID }, { id: 'lbl-101', name: 'component', color: '#3B82F6', projectId: PROJECT_DS_ID }], links: [], watchers: [], timeLogs: [],
    order: 30,
    dueDate: null, createdAt: '2026-02-01T09:00:00.000Z', updatedAt: '2026-02-01T09:00:00.000Z',
  },
];

// Wire up epic sub-tasks references
trkIssues[0].subTasks = [
  { id: 'iss-003', title: 'Set up JWT authentication middleware', number: 3, type: IssueType.STORY, priority: Priority.HIGH, status: s('st-trk-4') },
  { id: 'iss-004', title: 'Create login and registration pages', number: 4, type: IssueType.STORY, priority: Priority.HIGH, status: s('st-trk-4') },
  { id: 'iss-012', title: 'Fix login form not clearing errors on retry', number: 12, type: IssueType.BUG, priority: Priority.MEDIUM, status: s('st-trk-1') },
];

trkIssues[1].subTasks = [
  { id: 'iss-009', title: 'Implement Kanban board with drag-and-drop columns', number: 9, type: IssueType.STORY, priority: Priority.HIGH, status: s('st-trk-2') },
  { id: 'iss-010', title: 'Build issue detail page with sidebar', number: 10, type: IssueType.STORY, priority: Priority.HIGH, status: s('st-trk-3') },
  { id: 'iss-014', title: 'Implement backlog view with drag-to-reorder', number: 14, type: IssueType.STORY, priority: Priority.MEDIUM, status: s('st-trk-1') },
];

export const issues: Issue[] = [...trkIssues, ...dsIssues];
