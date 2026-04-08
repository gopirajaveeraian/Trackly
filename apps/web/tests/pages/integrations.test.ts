import { describe, it, expect } from 'vitest';

describe('IntegrationsPage', () => {
  it('exports correctly', async () => {
    const module = await import('@/pages/integrations/IntegrationsPage');
    expect(module).toBeDefined();
    expect(module.IntegrationsPage).toBeDefined();
    expect(typeof module.IntegrationsPage).toBe('function');
  });
});
