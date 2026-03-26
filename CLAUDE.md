# CLAUDE.md – Trackly Project Guide

## Project Overview

**Trackly** is an end-to-end project management and issue tracking application inspired by Jira.
It enables teams to plan, track, and ship work efficiently using Agile methodologies (Scrum & Kanban).

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod (validation)
- **Drag & Drop:** @dnd-kit/core
- **Charts & Reports:** Recharts
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js + Express.js (TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT + Refresh Tokens
- **File Uploads:** Multer + AWS S3 (or local storage)
- **Email:** Nodemailer
- **WebSockets:** Socket.io (real-time updates)
- **API Style:** REST API

### DevOps / Tooling
- **Monorepo:** Turborepo
- **Package Manager:** pnpm
- **Linting:** ESLint + Prettier
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

---

## Project Structure

```
trackly/
├── apps/
│   ├── web/                        # React frontend
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Reusable UI components (shadcn)
│   │   │   │   ├── layout/         # Sidebar, Navbar, etc.
│   │   │   │   ├── board/          # Kanban / Scrum board components
│   │   │   │   ├── issues/         # Issue cards, modals, forms
│   │   │   │   ├── projects/       # Project list, settings
│   │   │   │   └── reports/        # Charts, burndown, velocity
│   │   │   ├── pages/
│   │   │   │   ├── auth/           # Login, Register, ForgotPassword
│   │   │   │   ├── dashboard/      # Home dashboard
│   │   │   │   ├── projects/       # Projects list & detail
│   │   │   │   ├── board/          # Kanban / Sprint board
│   │   │   │   ├── backlog/        # Backlog management
│   │   │   │   ├── issues/         # Issue detail page
│   │   │   │   ├── reports/        # Reports & analytics
│   │   │   │   └── settings/       # User & workspace settings
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── store/              # Zustand stores
│   │   │   ├── services/           # API service functions
│   │   │   ├── types/              # TypeScript types/interfaces
│   │   │   ├── utils/              # Helper functions
│   │   │   └── App.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── api/                        # Express backend
│       ├── src/
│       │   ├── config/             # DB, env, server config
│       │   ├── controllers/        # Route controllers
│       │   ├── middleware/         # Auth, error handling, validation
│       │   ├── routes/             # API route definitions
│       │   ├── services/           # Business logic
│       │   ├── utils/              # Helpers, mailer, upload
│       │   ├── sockets/            # Socket.io event handlers
│       │   └── app.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared-types/               # Shared TS types between frontend & backend
│   └── ui-kit/                     # Shared component library (optional)
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

---

## Core Features to Implement

### 1. Authentication & Authorization
- [ ] User registration & login (JWT)
- [ ] Role-based access control: `Admin`, `Project Manager`, `Developer`, `Viewer`
- [ ] OAuth (Google login) — optional
- [ ] Forgot password / reset via email
- [ ] Session management with refresh tokens

### 2. Workspace & Organization
- [ ] Create / manage workspaces
- [ ] Invite members via email
- [ ] Manage member roles per workspace
- [ ] Workspace-level settings

### 3. Project Management
- [ ] Create, edit, archive projects
- [ ] Project types: **Scrum** or **Kanban**
- [ ] Project key (e.g., `TRK-1`, `TRK-2`) auto-generation
- [ ] Project members and role assignment
- [ ] Project settings (visibility, category, description)

### 4. Issue Tracking
- [ ] Create issues with: Title, Description (rich text), Type, Priority, Assignee, Labels, Due Date
- [ ] Issue types: `Bug`, `Story`, `Task`, `Epic`, `Sub-task`
- [ ] Priority levels: `Critical`, `High`, `Medium`, `Low`
- [ ] Issue status workflow (customizable per project)
- [ ] Link issues (blocks, is blocked by, relates to, duplicates)
- [ ] File attachments on issues
- [ ] Comments with @mentions
- [ ] Issue activity / history log
- [ ] Watchers & notifications

### 5. Scrum Board
- [ ] Sprint creation, planning, and management
- [ ] Drag & drop issues across sprint columns
- [ ] Sprint start / complete workflow
- [ ] Sprint goal and timeline
- [ ] Unassigned / backlog items in sprint planning

### 6. Kanban Board
- [ ] Customizable columns (statuses)
- [ ] WIP (Work In Progress) limits per column
- [ ] Drag & drop cards across columns
- [ ] Swimlanes by assignee / epic / priority

### 7. Backlog Management
- [ ] View all unassigned sprint issues
- [ ] Drag & drop to prioritize backlog
- [ ] Bulk edit / move to sprint
- [ ] Epic grouping in backlog

### 8. Epics & Roadmap
- [ ] Create and manage Epics
- [ ] Link issues to Epics
- [ ] Timeline / Gantt view for Epics
- [ ] Progress tracking per Epic

### 9. Reports & Analytics
- [ ] Burndown chart (Sprint)
- [ ] Velocity chart
- [ ] Cumulative Flow Diagram
- [ ] Issue status summary
- [ ] Team workload report
- [ ] Created vs Resolved chart

### 10. Notifications
- [ ] In-app notifications (real-time via Socket.io)
- [ ] Email notifications for assignments, mentions, due dates
- [ ] Notification preferences per user

### 11. Search & Filters
- [ ] Global search across issues, projects, users
- [ ] Advanced filters: status, assignee, label, priority, date range
- [ ] Save custom filters
- [ ] Quick filters on board view

### 12. Settings
- [ ] User profile & avatar
- [ ] Workspace settings
- [ ] Custom issue statuses per project
- [ ] Webhook integrations (GitHub, Slack — optional)
- [ ] Audit logs

---

## Database Schema (Key Models)

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  password      String
  avatar        String?
  createdAt     DateTime  @default(now())
  workspaces    WorkspaceMember[]
  assignedIssues Issue[]  @relation("Assignee")
  reportedIssues Issue[]  @relation("Reporter")
  comments      Comment[]
}

model Workspace {
  id        String    @id @default(uuid())
  name      String
  slug      String    @unique
  members   WorkspaceMember[]
  projects  Project[]
  createdAt DateTime  @default(now())
}

model WorkspaceMember {
  id          String    @id @default(uuid())
  userId      String
  workspaceId String
  role        Role      @default(DEVELOPER)
  user        User      @relation(fields: [userId], references: [id])
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}

model Project {
  id          String      @id @default(uuid())
  name        String
  key         String      // e.g., "TRK"
  type        ProjectType @default(SCRUM)
  description String?
  workspaceId String
  workspace   Workspace   @relation(fields: [workspaceId], references: [id])
  issues      Issue[]
  sprints     Sprint[]
  statuses    Status[]
  createdAt   DateTime    @default(now())
}

model Issue {
  id          String    @id @default(uuid())
  title       String
  description String?
  type        IssueType @default(TASK)
  priority    Priority  @default(MEDIUM)
  statusId    String
  status      Status    @relation(fields: [statusId], references: [id])
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  assigneeId  String?
  assignee    User?     @relation("Assignee", fields: [assigneeId], references: [id])
  reporterId  String
  reporter    User      @relation("Reporter", fields: [reporterId], references: [id])
  sprintId    String?
  sprint      Sprint?   @relation(fields: [sprintId], references: [id])
  epicId      String?
  epic        Issue?    @relation("Epic", fields: [epicId], references: [id])
  subTasks    Issue[]   @relation("Epic")
  comments    Comment[]
  attachments Attachment[]
  dueDate     DateTime?
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Sprint {
  id        String    @id @default(uuid())
  name      String
  goal      String?
  startDate DateTime?
  endDate   DateTime?
  status    SprintStatus @default(PLANNED)
  projectId String
  project   Project   @relation(fields: [projectId], references: [id])
  issues    Issue[]
}

model Status {
  id        String    @id @default(uuid())
  name      String
  color     String
  order     Int
  projectId String
  project   Project   @relation(fields: [projectId], references: [id])
  issues    Issue[]
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  issueId   String
  issue     Issue    @relation(fields: [issueId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

model Attachment {
  id        String   @id @default(uuid())
  filename  String
  url       String
  issueId   String
  issue     Issue    @relation(fields: [issueId], references: [id])
  createdAt DateTime @default(now())
}

enum Role        { ADMIN PROJECT_MANAGER DEVELOPER VIEWER }
enum IssueType   { BUG STORY TASK EPIC SUBTASK }
enum Priority    { CRITICAL HIGH MEDIUM LOW }
enum ProjectType { SCRUM KANBAN }
enum SprintStatus { PLANNED ACTIVE COMPLETED }
```

---

## API Routes Overview

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

# Workspace
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PUT    /api/workspaces/:id
POST   /api/workspaces/:id/invite
GET    /api/workspaces/:id/members

# Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/members
GET    /api/projects/:id/statuses
POST   /api/projects/:id/statuses

# Issues
GET    /api/issues?projectId=&sprintId=&status=&assignee=
POST   /api/issues
GET    /api/issues/:id
PUT    /api/issues/:id
DELETE /api/issues/:id
PATCH  /api/issues/:id/status
PATCH  /api/issues/:id/order
POST   /api/issues/:id/comments
POST   /api/issues/:id/attachments
GET    /api/issues/:id/activity

# Sprints
GET    /api/sprints?projectId=
POST   /api/sprints
GET    /api/sprints/:id
PUT    /api/sprints/:id
POST   /api/sprints/:id/start
POST   /api/sprints/:id/complete

# Reports
GET    /api/reports/burndown?sprintId=
GET    /api/reports/velocity?projectId=
GET    /api/reports/workload?projectId=

# Notifications
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all

# Search
GET    /api/search?q=
```

---

## Environment Variables

```env
# apps/api/.env

DATABASE_URL=postgresql://user:password@localhost:5432/trackly
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development

CLIENT_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=trackly-uploads
AWS_REGION=ap-south-1
```

```env
# apps/web/.env

VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all apps (dev mode)
pnpm dev

# Start only frontend
pnpm --filter web dev

# Start only backend
pnpm --filter api dev

# Run database migrations
pnpm --filter api prisma migrate dev

# Seed database
pnpm --filter api prisma db seed

# Build all
pnpm build

# Run tests
pnpm test

# Run E2E tests
pnpm --filter web test:e2e

# Docker (full stack)
docker-compose up --build
```

---

## Coding Conventions

- Use **TypeScript strictly** — no `any` types
- Follow **feature-based folder structure** inside components/pages
- All API calls go through **service layer** (`services/`) — never call fetch directly in components
- Use **Zod schemas** for all form validation and API input validation
- Use **Prisma transactions** for multi-step DB operations
- All errors must be handled via a **centralized error handler** middleware
- Use **React Query** for all server state — no manual loading/error state
- Keep components **small and focused** — extract logic into custom hooks
- Follow **RESTful naming conventions** for API routes
- Write **JSDoc comments** for all service functions

---

## Key Implementation Notes for Claude Code

1. **Start with Auth** — implement JWT login/register before any other feature
2. **Set up Prisma schema first** — run migrations before writing controllers
3. **Build shared types package** — define interfaces used by both frontend and backend early
4. **Implement board drag & drop** using `@dnd-kit` — it handles accessibility better than react-beautiful-dnd
5. **Socket.io setup** — initialize on the server and connect on the client after login
6. **Rich text editor** — use `@tiptap/react` for issue description editor
7. **Always paginate** list endpoints — use cursor-based pagination
8. **Optimistic updates** — use React Query's `onMutate` for instant UI feedback on drag & drop
9. **Seed data** — create a seed script with sample workspace, project, users, and issues for dev testing
10. **Mobile responsive** — ensure board and issue pages are usable on tablet/mobile

---

## Suggested Build Order

```
Phase 1 – Foundation
  ✅ Project setup (Turborepo + pnpm + Docker)
  ✅ Database schema + Prisma setup
  ✅ Auth (register, login, JWT, refresh)
  ✅ Basic UI layout (sidebar, navbar, routing)

Phase 2 – Core Features
  ✅ Workspace & Project CRUD
  ✅ Issue CRUD + detail page
  ✅ Status management
  ✅ Kanban board (drag & drop)

Phase 3 – Agile Features
  ✅ Sprint management
  ✅ Scrum board
  ✅ Backlog view
  ✅ Epics

Phase 4 – Collaboration
  ✅ Comments + mentions
  ✅ File attachments
  ✅ Real-time notifications (Socket.io)
  ✅ Email notifications

Phase 5 – Reports & Polish
  ✅ Burndown + Velocity charts
  ✅ Search & filters
  ✅ Settings pages
  ✅ E2E tests + performance optimization
```

---

## Notes

- This file is the **single source of truth** for Claude Code when working on Trackly
- Always refer to this file before making architectural decisions
- Update this file when new packages, routes, or conventions are added
- Prefer **incremental commits** per feature/phase
