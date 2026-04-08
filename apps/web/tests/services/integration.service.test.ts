import { describe, it, expect } from 'vitest';
import { integrationService } from '@/services/integration.service';

describe('integrationService', () => {
  it('has all expected methods', () => {
    expect(typeof integrationService.list).toBe('function');
    expect(typeof integrationService.create).toBe('function');
    expect(typeof integrationService.update).toBe('function');
    expect(typeof integrationService.delete).toBe('function');
    expect(typeof integrationService.testConnection).toBe('function');
  });

  it('exports service object with correct shape', () => {
    const methods = Object.keys(integrationService);
    expect(methods).toContain('list');
    expect(methods).toContain('create');
    expect(methods).toContain('update');
    expect(methods).toContain('delete');
    expect(methods).toContain('testConnection');
    expect(methods).toHaveLength(5);
  });
});
