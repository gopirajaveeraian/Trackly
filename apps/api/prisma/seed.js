"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // ─── Clean existing data ────────────────────────────────────────────────
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
    // ─── Create test user ───────────────────────────────────────────────────
    const hashedPassword = await bcryptjs_1.default.hash('password123', 12);
    const testUser = await prisma.user.create({
        data: {
            name: 'Test User',
            email: 'test@trackly.com',
            password: hashedPassword,
        },
    });
    const secondUser = await prisma.user.create({
        data: {
            name: 'Jane Developer',
            email: 'jane@trackly.com',
            password: hashedPassword,
        },
    });
    console.log(`Created users: ${testUser.email}, ${secondUser.email}`);
    // ─── Create workspace ──────────────────────────────────────────────────
    const workspace = await prisma.workspace.create({
        data: {
            name: 'Trackly Team',
            slug: 'trackly-team',
        },
    });
    await prisma.workspaceMember.createMany({
        data: [
            { userId: testUser.id, workspaceId: workspace.id, role: 'ADMIN' },
            { userId: secondUser.id, workspaceId: workspace.id, role: 'DEVELOPER' },
        ],
    });
    console.log(`Created workspace: ${workspace.name}`);
    // ─── Create project ────────────────────────────────────────────────────
    const project = await prisma.project.create({
        data: {
            name: 'Trackly App',
            key: 'TRK',
            type: 'SCRUM',
            description: 'The main Trackly project management application',
            workspaceId: workspace.id,
        },
    });
    console.log(`Created project: ${project.name}`);
    // ─── Create statuses ───────────────────────────────────────────────────
    const [todoStatus, inProgressStatus, inReviewStatus, doneStatus] = await Promise.all([
        prisma.status.create({
            data: { name: 'To Do', color: '#6B7280', order: 0, projectId: project.id },
        }),
        prisma.status.create({
            data: { name: 'In Progress', color: '#3B82F6', order: 1, projectId: project.id },
        }),
        prisma.status.create({
            data: { name: 'In Review', color: '#F59E0B', order: 2, projectId: project.id },
        }),
        prisma.status.create({
            data: { name: 'Done', color: '#10B981', order: 3, projectId: project.id },
        }),
    ]);
    console.log('Created default statuses');
    // ─── Create sprint ─────────────────────────────────────────────────────
    const sprint = await prisma.sprint.create({
        data: {
            name: 'Sprint 1',
            goal: 'Set up project foundation and core features',
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            projectId: project.id,
        },
    });
    console.log(`Created sprint: ${sprint.name}`);
    // ─── Create sample issues ──────────────────────────────────────────────
    const issues = await Promise.all([
        prisma.issue.create({
            data: {
                title: 'Set up authentication system',
                description: 'Implement JWT-based authentication with refresh tokens, login, register, and password reset flows.',
                type: 'STORY',
                priority: 'HIGH',
                number: 1,
                statusId: doneStatus.id,
                projectId: project.id,
                reporterId: testUser.id,
                assigneeId: testUser.id,
                sprintId: sprint.id,
                order: 0,
            },
        }),
        prisma.issue.create({
            data: {
                title: 'Create Kanban board UI',
                description: 'Build the drag-and-drop Kanban board with columns for each status. Support reordering within columns.',
                type: 'STORY',
                priority: 'HIGH',
                number: 2,
                statusId: inProgressStatus.id,
                projectId: project.id,
                reporterId: testUser.id,
                assigneeId: secondUser.id,
                sprintId: sprint.id,
                order: 0,
            },
        }),
        prisma.issue.create({
            data: {
                title: 'Fix login redirect loop',
                description: 'Users are getting stuck in a redirect loop when their session expires and they try to access a protected page.',
                type: 'BUG',
                priority: 'CRITICAL',
                number: 3,
                statusId: inReviewStatus.id,
                projectId: project.id,
                reporterId: secondUser.id,
                assigneeId: testUser.id,
                sprintId: sprint.id,
                order: 0,
            },
        }),
        prisma.issue.create({
            data: {
                title: 'Add issue filtering and search',
                description: 'Implement search bar and filter controls for the issue list. Support filtering by status, assignee, priority, and type.',
                type: 'TASK',
                priority: 'MEDIUM',
                number: 4,
                statusId: todoStatus.id,
                projectId: project.id,
                reporterId: testUser.id,
                assigneeId: secondUser.id,
                sprintId: sprint.id,
                order: 0,
            },
        }),
        prisma.issue.create({
            data: {
                title: 'Design project settings page',
                description: 'Create the UI for project settings including name, key, type, and custom status management.',
                type: 'TASK',
                priority: 'LOW',
                number: 5,
                statusId: todoStatus.id,
                projectId: project.id,
                reporterId: testUser.id,
                sprintId: sprint.id,
                order: 1,
            },
        }),
        prisma.issue.create({
            data: {
                title: 'Sprint management epic',
                description: 'Epic covering all sprint management features: creation, planning, start/complete workflow, and sprint reports.',
                type: 'EPIC',
                priority: 'HIGH',
                number: 6,
                statusId: todoStatus.id,
                projectId: project.id,
                reporterId: testUser.id,
                order: 2,
            },
        }),
    ]);
    console.log(`Created ${issues.length} sample issues`);
    // ─── Create sample comments ────────────────────────────────────────────
    await prisma.comment.createMany({
        data: [
            {
                content: 'JWT authentication is working. Refresh token rotation is implemented.',
                issueId: issues[0].id,
                authorId: testUser.id,
            },
            {
                content: 'I have started working on this. Using @dnd-kit for drag and drop.',
                issueId: issues[1].id,
                authorId: secondUser.id,
            },
            {
                content: 'I think the issue is in the auth middleware. The token check runs before the redirect.',
                issueId: issues[2].id,
                authorId: testUser.id,
            },
        ],
    });
    console.log('Created sample comments');
    // ─── Create sample activity logs ───────────────────────────────────────
    await prisma.activityLog.createMany({
        data: [
            {
                action: 'CREATED',
                issueId: issues[0].id,
                userId: testUser.id,
            },
            {
                action: 'UPDATED',
                field: 'status',
                oldValue: 'To Do',
                newValue: 'In Progress',
                issueId: issues[0].id,
                userId: testUser.id,
            },
            {
                action: 'UPDATED',
                field: 'status',
                oldValue: 'In Progress',
                newValue: 'Done',
                issueId: issues[0].id,
                userId: testUser.id,
            },
            {
                action: 'CREATED',
                issueId: issues[1].id,
                userId: testUser.id,
            },
            {
                action: 'UPDATED',
                field: 'assignee',
                oldValue: null,
                newValue: secondUser.id,
                issueId: issues[1].id,
                userId: testUser.id,
            },
        ],
    });
    console.log('Created sample activity logs');
    console.log('\nSeed completed successfully!');
    console.log('─────────────────────────────────────────');
    console.log('Test credentials:');
    console.log('  Email:    test@trackly.com');
    console.log('  Password: password123');
    console.log('─────────────────────────────────────────');
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
//# sourceMappingURL=seed.js.map