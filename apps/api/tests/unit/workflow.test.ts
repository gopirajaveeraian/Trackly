import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  workflowTransition: {
    count: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
  },
  status: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../../src/config/db', () => ({
  prisma: mockPrisma,
}));

import { validateTransition } from '../../src/services/workflow.service';

describe('Workflow Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow all transitions when no transitions configured (permissive mode)', async () => {
    mockPrisma.workflowTransition.count.mockResolvedValue(0);
    const result = await validateTransition('project-1', 'status-1', 'status-2');
    expect(result).toBe(true);
  });

  it('should allow transition when it exists', async () => {
    mockPrisma.workflowTransition.count.mockResolvedValue(5);
    mockPrisma.workflowTransition.findUnique.mockResolvedValue({
      id: 'transition-1',
      fromStatusId: 'status-1',
      toStatusId: 'status-2',
      projectId: 'project-1',
    });
    const result = await validateTransition('project-1', 'status-1', 'status-2');
    expect(result).toBe(true);
  });

  it('should block transition when it does not exist', async () => {
    mockPrisma.workflowTransition.count.mockResolvedValue(5);
    mockPrisma.workflowTransition.findUnique.mockResolvedValue(null);
    const result = await validateTransition('project-1', 'status-1', 'status-3');
    expect(result).toBe(false);
  });
});
