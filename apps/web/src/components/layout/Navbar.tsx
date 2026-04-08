import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Bell,
  ChevronRight,
  Command,
  UserPlus,
  AtSign,
  MessageSquare,
  RefreshCw,
  Calendar,
  Bug,
  ListTodo,
  BookOpen,
  Layers,
  Loader2,
  Sun,
  Moon,
  Waves,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore, type Theme } from '@/store/theme.store';
import { notificationService } from '@/services/notification.service';
import { issueService } from '@/services/issue.service';
import { NotificationType, IssueType } from '@/types';
import type { BreadcrumbItem, Notification, Issue } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface NavbarProps {
  breadcrumbs?: BreadcrumbItem[];
}

const notificationTypeIcons: Record<NotificationType, typeof UserPlus> = {
  [NotificationType.ASSIGNED]: UserPlus,
  [NotificationType.MENTIONED]: AtSign,
  [NotificationType.COMMENT]: MessageSquare,
  [NotificationType.STATUS_CHANGED]: RefreshCw,
  [NotificationType.DUE_DATE]: Calendar,
};

const notificationTypeColors: Record<NotificationType, string> = {
  [NotificationType.ASSIGNED]: 'text-blue-600 bg-blue-50',
  [NotificationType.MENTIONED]: 'text-purple-600 bg-purple-50',
  [NotificationType.COMMENT]: 'text-green-600 bg-green-50',
  [NotificationType.STATUS_CHANGED]: 'text-amber-600 bg-amber-50',
  [NotificationType.DUE_DATE]: 'text-red-600 bg-red-50',
};

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  [IssueType.BUG]: <Bug className="h-4 w-4 text-danger-600" />,
  [IssueType.TASK]: <ListTodo className="h-4 w-4 text-primary-500" />,
  [IssueType.STORY]: <BookOpen className="h-4 w-4 text-success-500" />,
  [IssueType.EPIC]: <Layers className="h-4 w-4 text-accent-600" />,
  [IssueType.SUBTASK]: <ListTodo className="h-4 w-4 text-gray-400" />,
};

const themeConfig: { key: Theme; icon: typeof Sun; label: string; color: string }[] = [
  { key: 'light', icon: Sun, label: 'Light', color: 'text-amber-500' },
  { key: 'dark', icon: Moon, label: 'Dark', color: 'text-indigo-400' },
  { key: 'ocean', icon: Waves, label: 'Ocean', color: 'text-cyan-500' },
];

export function Navbar({ breadcrumbs = [] }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Debounce the search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Show/hide search results based on debounced query
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [debouncedSearch]);

  // Close search dropdown when navigating away
  useEffect(() => {
    setShowSearchResults(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }, [location.pathname]);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => issueService.list({ search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  // Fetch unread count (poll every 30 seconds)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30000,
  });

  // Fetch notifications list (only when panel is open)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationService.list(),
    enabled: showNotifications,
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
      if (
        themeRef.current &&
        !themeRef.current.contains(event.target as Node)
      ) {
        setShowThemeMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('global-search');
        searchInput?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchResultClick = useCallback(
    (issue: Issue) => {
      setShowSearchResults(false);
      setSearchQuery('');
      setDebouncedSearch('');
      navigate(`/issues/${issue.id}`);
    },
    [navigate],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setShowSearchResults(false);
        (event.target as HTMLInputElement).blur();
      }
      if (event.key === 'Enter') {
        const results = searchResults?.data?.slice(0, 8);
        if (results && results.length > 0) {
          handleSearchResultClick(results[0]);
        }
      }
    },
    [searchResults, handleSearchResultClick],
  );

  function handleNotificationClick(notification: Notification) {
    // Mark as read if unread
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to issue if linked
    if (notification.issueId) {
      setShowNotifications(false);
      navigate(`/issues/${notification.issueId}`);
    }
  }

  function handleMarkAllAsRead() {
    markAllAsReadMutation.mutate();
  }

  // Close search when opening notifications, and vice versa
  function handleToggleNotifications() {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      setShowSearchResults(false);
    }
  }

  function handleSearchFocus() {
    if (debouncedSearch.length >= 2) {
      setShowSearchResults(true);
      setShowNotifications(false);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    // Close notifications when user starts searching
    if (e.target.value.length > 0) {
      setShowNotifications(false);
    }
  }

  const displayedResults = searchResults?.data?.slice(0, 8) ?? [];

  return (
    <header className="h-14 bg-surface border-b border-th-border flex items-center justify-between px-6 flex-shrink-0" role="banner">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.label} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400 mx-1" />
            )}
            {crumb.href ? (
              <button
                onClick={() => navigate(crumb.href!)}
                className="text-gray-500 hover:text-primary-600 transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="global-search"
            type="search"
            placeholder="Search issues..."
            aria-label="Search issues"
            autoComplete="off"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKeyDown}
            className="w-64 pl-9 pr-16 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-300 focus:outline-none transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && debouncedSearch.length >= 2 && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="px-4 py-6 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">
                    Searching...
                  </span>
                </div>
              ) : displayedResults.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No results for "{debouncedSearch}"
                  </p>
                </div>
              ) : (
                <div>
                  {displayedResults.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => handleSearchResultClick(issue)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                    >
                      {/* Issue type icon */}
                      <span className="flex-shrink-0">
                        {issueTypeIcons[issue.type]}
                      </span>

                      {/* Issue title */}
                      <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">
                        {issue.title}
                      </span>

                      {/* Status badge */}
                      {issue.status && (
                        <Badge variant="default" className="flex-shrink-0 text-[10px]">
                          {issue.status.name}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setShowThemeMenu((prev) => !prev)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Change theme"
          >
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-indigo-400" />
            ) : theme === 'ocean' ? (
              <Waves className="h-5 w-5 text-cyan-500" />
            ) : (
              <Sun className="h-5 w-5 text-amber-500" />
            )}
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {themeConfig.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTheme(t.key);
                      setShowThemeMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      theme === t.key
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', t.color)} />
                    {t.label}
                    {theme === t.key && (
                      <span className="ml-auto text-primary-600 text-xs">Active</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={showNotifications}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[480px] overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
                <h3 className="text-sm font-semibold text-gray-900">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification List */}
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => {
                    const Icon =
                      notificationTypeIcons[notification.type] || Bell;
                    const iconColor =
                      notificationTypeColors[notification.type] ||
                      'text-gray-600 bg-gray-50';

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex items-start gap-3',
                          !notification.read && 'bg-primary-50',
                        )}
                      >
                        {/* Type Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5',
                            iconColor,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm text-gray-700 leading-snug',
                              !notification.read && 'font-medium text-gray-900',
                            )}
                          >
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true },
                            )}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notification.read && (
                          <div className="flex-shrink-0 mt-2">
                            <span className="block h-2 w-2 bg-primary-600 rounded-full" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1 pr-2 transition-colors"
            aria-label="User menu"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <Avatar
              name={user?.name || 'User'}
              src={user?.avatar}
              size="sm"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Settings
              </button>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors'
                  )}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
