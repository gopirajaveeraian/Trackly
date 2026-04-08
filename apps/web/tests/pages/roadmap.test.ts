import { describe, it, expect } from 'vitest';

describe('RoadmapPage', () => {
  it('exports correctly', async () => {
    const module = await import('@/pages/roadmap/RoadmapPage');
    expect(module).toBeDefined();
    expect(module.RoadmapPage).toBeDefined();
    expect(typeof module.RoadmapPage).toBe('function');
  });
});
