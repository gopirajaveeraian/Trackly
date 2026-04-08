import { describe, it, expect } from 'vitest';

describe('ReleasesPage', () => {
  it('exports correctly', async () => {
    const module = await import('@/pages/releases/ReleasesPage');
    expect(module).toBeDefined();
    expect(module.ReleasesPage).toBeDefined();
    expect(typeof module.ReleasesPage).toBe('function');
  });
});
