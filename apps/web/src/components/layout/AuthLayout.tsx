import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
