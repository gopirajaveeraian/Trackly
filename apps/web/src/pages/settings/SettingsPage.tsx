import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { cn } from '@/utils/cn';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const tabs = [
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'security' as const, label: 'Security', icon: Shield },
  { id: 'appearance' as const, label: 'Appearance', icon: Palette },
];

type TabId = (typeof tabs)[number]['id'];

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme: currentTheme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  function onSubmitProfile(data: ProfileFormValues) {
    // Profile update would be handled here
    console.log('Profile update:', data);
  }

  function onSubmitPassword(data: PasswordFormValues) {
    // Password update would be handled here
    console.log('Password update:', data);
    resetPassword();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-48 flex-shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>

              <div className="mt-6 flex items-center gap-4 mb-6">
                <Avatar
                  name={user?.name ?? 'User'}
                  src={user?.avatar}
                  size="lg"
                />
                <div>
                  <Button variant="secondary" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit(onSubmitProfile)}
                className="space-y-5"
              >
                <Input
                  label="Full Name"
                  error={errors.name?.message}
                  {...register('name')}
                />
                <Input
                  label="Email"
                  type="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <div className="flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <div className="mt-6 space-y-4">
                {[
                  {
                    label: 'Issue assigned to me',
                    description:
                      'Get notified when someone assigns an issue to you',
                  },
                  {
                    label: 'Issue status changed',
                    description:
                      'Get notified when the status of your issues changes',
                  },
                  {
                    label: 'New comments',
                    description:
                      'Get notified when someone comments on your issues',
                  },
                  {
                    label: 'Mentions',
                    description:
                      'Get notified when someone mentions you in a comment',
                  },
                  {
                    label: 'Due date reminders',
                    description:
                      'Get reminded when issues are approaching their due date',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <form
                onSubmit={handleSubmitPassword(onSubmitPassword)}
                className="mt-6 space-y-5"
              >
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
                <div className="flex justify-end">
                  <Button type="submit">Update Password</Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose your preferred theme
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light' as const, label: 'Light' },
                    { id: 'dark' as const, label: 'Dark' },
                    { id: 'ocean' as const, label: 'Ocean' },
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id)}
                      className={cn(
                        'p-4 rounded-lg border-2 text-center transition-colors',
                        currentTheme === themeOption.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div
                        className={cn(
                          'h-12 rounded-md mb-2 mx-auto w-16',
                          themeOption.id === 'light'
                            ? 'bg-white border border-gray-200'
                            : themeOption.id === 'dark'
                              ? 'bg-gray-800'
                              : 'bg-gradient-to-r from-blue-400 to-cyan-500'
                        )}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {themeOption.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
