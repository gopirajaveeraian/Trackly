import { useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Settings,
  Columns3,
  List,
  Timer,
  Layers,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';

interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: SidebarNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: <FolderKanban className="h-5 w-5" />,
  },
  {
    label: 'My Issues',
    href: '/my-issues',
    icon: <ListTodo className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

function getProjectNavItems(projectId: string): SidebarNavItem[] {
  return [
    {
      label: 'Board',
      href: `/board/${projectId}`,
      icon: <Columns3 className="h-5 w-5" />,
    },
    {
      label: 'Backlog',
      href: `/backlog/${projectId}`,
      icon: <List className="h-5 w-5" />,
    },
    {
      label: 'Sprints',
      href: `/sprints/${projectId}`,
      icon: <Timer className="h-5 w-5" />,
    },
    {
      label: 'Epics',
      href: `/epics/${projectId}`,
      icon: <Layers className="h-5 w-5" />,
    },
    {
      label: 'Reports',
      href: `/reports/${projectId}`,
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const location = useLocation();
  const params = useParams();

  // Detect if we're in a project context
  const projectId =
    params.projectId || params.id;
  const isProjectContext =
    location.pathname.includes('/board/') ||
    location.pathname.includes('/backlog/') ||
    location.pathname.includes('/sprints/') ||
    location.pathname.includes('/epics/') ||
    location.pathname.includes('/reports/') ||
    (location.pathname.includes('/projects/') && projectId);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r transition-all duration-300 flex-shrink-0',
        'bg-surface border-th-border',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-th-border-subtle">
        {!collapsed && (
          <h1 className="text-xl font-bold gradient-text">Trackly</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Workspace Selector */}
      <WorkspaceSelector collapsed={collapsed} />

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-2'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Project Sub-Navigation */}
        {isProjectContext && projectId && !collapsed && (
          <div className="mt-6">
            <h4 className="section-title text-[10px] px-3 mb-2">
              Project
            </h4>
            <div className="space-y-1">
              {getProjectNavItems(projectId).map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {isProjectContext && projectId && collapsed && (
          <div className="mt-6 space-y-1">
            {getProjectNavItems(projectId).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
                title={item.label}
              >
                {item.icon}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-th-border-subtle p-3">
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center'
          )}
        >
          <Avatar
            name={user?.name || 'User'}
            src={user?.avatar}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
