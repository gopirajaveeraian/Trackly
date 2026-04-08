import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/services/socket.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connectSocket(user.id);
    }

    // Only disconnect on full unmount (logout), not on route changes
    return () => {
      if (!useAuthStore.getState().isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
