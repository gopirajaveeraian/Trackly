import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import type { AuthUser } from '@/types';

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatar: null,
};

const mockAccessToken = 'access-token-abc123';
const mockRefreshToken = 'refresh-token-xyz789';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should start with user as null', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should start with accessToken as null', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
    });

    it('should start with refreshToken as null', () => {
      const state = useAuthStore.getState();
      expect(state.refreshToken).toBeNull();
    });

    it('should start with isAuthenticated as false', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login()', () => {
    it('should set user on login', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should set accessToken on login', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockAccessToken);
    });

    it('should set refreshToken on login', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();
      expect(state.refreshToken).toBe(mockRefreshToken);
    });

    it('should set isAuthenticated to true on login', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });

    it('should store accessToken in localStorage', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      expect(localStorage.getItem('accessToken')).toBe(mockAccessToken);
    });

    it('should store refreshToken in localStorage', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      // Login first so we have state to clear
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);
    });

    it('should clear user on logout', () => {
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should clear accessToken on logout', () => {
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
    });

    it('should clear refreshToken on logout', () => {
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.refreshToken).toBeNull();
    });

    it('should set isAuthenticated to false on logout', () => {
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove accessToken from localStorage', () => {
      useAuthStore.getState().logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('should remove refreshToken from localStorage', () => {
      useAuthStore.getState().logout();

      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('setUser()', () => {
    it('should update the user profile', () => {
      const updatedUser: AuthUser = {
        id: 'user-1',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };

      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(updatedUser);
    });

    it('should only update user without affecting tokens', () => {
      useAuthStore.getState().login(mockUser, mockAccessToken, mockRefreshToken);

      const updatedUser: AuthUser = {
        ...mockUser,
        name: 'Updated Name',
      };

      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user?.name).toBe('Updated Name');
      expect(state.accessToken).toBe(mockAccessToken);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should only update user without affecting isAuthenticated', () => {
      // setUser without prior login should not set isAuthenticated
      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
