import { describe, it, expect } from 'vitest';
import { capacityService } from '@/services/capacity.service';

describe('capacityService', () => {
  it('has all expected methods', () => {
    expect(typeof capacityService.list).toBe('function');
    expect(typeof capacityService.upsert).toBe('function');
  });

  it('exports service object with correct shape', () => {
    const methods = Object.keys(capacityService);
    expect(methods).toContain('list');
    expect(methods).toContain('upsert');
    expect(methods).toHaveLength(2);
  });
});
