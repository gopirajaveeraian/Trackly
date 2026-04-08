import { describe, it, expect } from 'vitest';
import { releaseService } from '@/services/release.service';

describe('releaseService', () => {
  it('has all expected methods', () => {
    expect(typeof releaseService.list).toBe('function');
    expect(typeof releaseService.create).toBe('function');
    expect(typeof releaseService.get).toBe('function');
    expect(typeof releaseService.update).toBe('function');
    expect(typeof releaseService.delete).toBe('function');
    expect(typeof releaseService.addIssue).toBe('function');
    expect(typeof releaseService.removeIssue).toBe('function');
  });

  it('exports service object with correct shape', () => {
    const methods = Object.keys(releaseService);
    expect(methods).toContain('list');
    expect(methods).toContain('create');
    expect(methods).toContain('get');
    expect(methods).toContain('update');
    expect(methods).toContain('delete');
    expect(methods).toContain('addIssue');
    expect(methods).toContain('removeIssue');
    expect(methods).toHaveLength(7);
  });
});
