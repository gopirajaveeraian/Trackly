import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/types';
import { AxiosError } from 'axios';
import type { ApiError } from '@/types';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation<AuthResponse, AxiosError<ApiError>, LoginRequest>({
    mutationFn: authService.login,
    onSuccess: (data) => {
      storeLogin(data.user, data.accessToken, data.refreshToken);
      queryClient.clear();
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation<AuthResponse, AxiosError<ApiError>, RegisterRequest>({
    mutationFn: authService.register,
    onSuccess: (data) => {
      storeLogin(data.user, data.accessToken, data.refreshToken);
      queryClient.clear();
      navigate('/dashboard');
    },
  });

  const logoutMutation = useMutation<void, AxiosError<ApiError>>({
    mutationFn: authService.logout,
    onSuccess: () => {
      storeLogout();
      useWorkspaceStore.getState().clearWorkspace();
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      // Even on error, clear local state
      storeLogout();
      useWorkspaceStore.getState().clearWorkspace();
      queryClient.clear();
      navigate('/login');
    },
  });

  const forgotPasswordMutation = useMutation<void, AxiosError<ApiError>, { email: string }>({
    mutationFn: authService.forgotPassword,
  });

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    loginError: loginMutation.error?.response?.data?.message || loginMutation.error?.message,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerError: registerMutation.error?.response?.data?.message || registerMutation.error?.message,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutate,
    forgotPasswordError: forgotPasswordMutation.error?.response?.data?.message,
    isForgotPasswordPending: forgotPasswordMutation.isPending,
    isForgotPasswordSuccess: forgotPasswordMutation.isSuccess,
  };
}
