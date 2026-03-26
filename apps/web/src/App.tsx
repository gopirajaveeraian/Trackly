import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useThemeStore } from '@/store/theme.store';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Eagerly loaded core pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage';

// Lazy-loaded pages (code-split for bundle size)
const BoardPage = lazy(() => import('@/pages/board/BoardPage').then(m => ({ default: m.BoardPage })));
const BacklogPage = lazy(() => import('@/pages/backlog/BacklogPage').then(m => ({ default: m.BacklogPage })));
const IssueDetailPage = lazy(() => import('@/pages/issues/IssueDetailPage').then(m => ({ default: m.IssueDetailPage })));
const MyIssuesPage = lazy(() => import('@/pages/issues/MyIssuesPage').then(m => ({ default: m.MyIssuesPage })));
const SprintsPage = lazy(() => import('@/pages/sprints/SprintsPage').then(m => ({ default: m.SprintsPage })));
const EpicsPage = lazy(() => import('@/pages/epics/EpicsPage').then(m => ({ default: m.EpicsPage })));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/board/:projectId" element={<BoardPage />} />
          <Route path="/backlog/:projectId" element={<BacklogPage />} />
          <Route path="/sprints/:projectId" element={<SprintsPage />} />
          <Route path="/epics/:projectId" element={<EpicsPage />} />
          <Route path="/reports/:projectId" element={<ReportsPage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />
          <Route path="/my-issues" element={<MyIssuesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
