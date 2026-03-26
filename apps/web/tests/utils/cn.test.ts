import { describe, it, expect } from 'vitest';
import { cn } from '@/utils/cn';

describe('cn() utility', () => {
  describe('basic class merging', () => {
    it('should merge multiple class name strings', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should return a single class name unchanged', () => {
      const result = cn('foo');
      expect(result).toBe('foo');
    });

    it('should return an empty string when called with no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null gracefully', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle empty strings', () => {
      const result = cn('foo', '', 'bar');
      expect(result).toBe('foo bar');
    });
  });

  describe('conditional classes', () => {
    it('should include class when condition is true', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should exclude class when condition is false', () => {
      const isActive = false;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base');
    });

    it('should handle object syntax for conditional classes', () => {
      const result = cn('base', { active: true, disabled: false });
      expect(result).toBe('base active');
    });

    it('should handle mixed conditional formats', () => {
      const result = cn('base', true && 'visible', { bold: true, italic: false });
      expect(result).toBe('base visible bold');
    });
  });

  describe('Tailwind CSS conflict resolution', () => {
    it('should resolve conflicting padding classes (last wins)', () => {
      const result = cn('px-4', 'px-6');
      expect(result).toBe('px-6');
    });

    it('should resolve conflicting text color classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should resolve conflicting background color classes', () => {
      const result = cn('bg-white', 'bg-black');
      expect(result).toBe('bg-black');
    });

    it('should resolve conflicting margin classes', () => {
      const result = cn('mt-2', 'mt-4');
      expect(result).toBe('mt-4');
    });

    it('should keep non-conflicting classes from different groups', () => {
      const result = cn('px-4 py-2', 'text-sm font-bold');
      expect(result).toBe('px-4 py-2 text-sm font-bold');
    });

    it('should resolve conflicting font-size classes', () => {
      const result = cn('text-sm', 'text-lg');
      expect(result).toBe('text-lg');
    });

    it('should resolve conflicting display classes', () => {
      const result = cn('block', 'flex');
      expect(result).toBe('flex');
    });

    it('should handle a realistic component styling scenario', () => {
      // Base styles + override styles (common pattern in component libraries)
      const baseStyles = 'px-4 py-2 text-sm bg-blue-500 text-white rounded-md';
      const overrideStyles = 'px-6 bg-red-500';
      const result = cn(baseStyles, overrideStyles);

      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4');
      expect(result).toContain('bg-red-500');
      expect(result).not.toContain('bg-blue-500');
      expect(result).toContain('py-2');
      expect(result).toContain('text-sm');
      expect(result).toContain('text-white');
      expect(result).toContain('rounded-md');
    });
  });

  describe('array inputs', () => {
    it('should handle arrays of class names', () => {
      const result = cn(['foo', 'bar']);
      expect(result).toBe('foo bar');
    });

    it('should handle nested arrays', () => {
      const result = cn(['foo', ['bar', 'baz']]);
      expect(result).toBe('foo bar baz');
    });
  });
});
