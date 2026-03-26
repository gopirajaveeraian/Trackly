import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, type Theme } from '@/store/theme.store';

describe('Theme Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useThemeStore.setState({ theme: 'light' });
    document.documentElement.removeAttribute('data-theme');
  });

  describe('initial state', () => {
    it('should have "light" as the default theme', () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
    });
  });

  describe('setTheme()', () => {
    it('should change theme to "dark"', () => {
      useThemeStore.getState().setTheme('dark');

      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should change theme to "ocean"', () => {
      useThemeStore.getState().setTheme('ocean');

      const state = useThemeStore.getState();
      expect(state.theme).toBe('ocean');
    });

    it('should change theme back to "light"', () => {
      useThemeStore.getState().setTheme('dark');
      useThemeStore.getState().setTheme('light');

      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
    });

    it('should set data-theme attribute on document element when theme changes to dark', () => {
      useThemeStore.getState().setTheme('dark');

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set data-theme attribute on document element when theme changes to ocean', () => {
      useThemeStore.getState().setTheme('ocean');

      expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    });

    it('should update data-theme attribute when switching between themes', () => {
      useThemeStore.getState().setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      useThemeStore.getState().setTheme('ocean');
      expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');

      useThemeStore.getState().setTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should accept all valid theme values', () => {
      const themes: Theme[] = ['light', 'dark', 'ocean'];

      for (const theme of themes) {
        useThemeStore.getState().setTheme(theme);
        const state = useThemeStore.getState();
        expect(state.theme).toBe(theme);
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      }
    });
  });
});
