import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Download,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  BarChart3,
  Users,
  Layers,
  ListTodo,
  MessageSquare,
  Tag,
  Link2,
  Timer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  jiraImportService,
  type JiraImportResult,
} from '@/services/jira-import.service';
import { useWorkspaceStore } from '@/store/workspace.store';
import { cn } from '@/utils/cn';
import { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const jiraImportSchema = z.object({
  jiraBaseUrl: z
    .string()
    .min(1, 'Jira URL is required')
    .url('Must be a valid URL')
    .refine(
      (url) => url.includes('atlassian.net') || url.startsWith('https://'),
      'Must be a valid Jira Cloud URL (e.g. https://yourcompany.atlassian.net)'
    ),
  jiraEmail: z
    .string()
    .min(1, 'Email is required')
    .email('Must be a valid email address'),
  jiraApiToken: z
    .string()
    .min(1, 'API token is required')
    .min(10, 'API token seems too short'),
  jiraProjectKey: z
    .string()
    .min(1, 'Project key is required')
    .max(10, 'Project key is too long')
    .regex(/^[A-Z][A-Z0-9]*$/, 'Must be uppercase letters/numbers, starting with a letter'),
});

type JiraImportFormValues = z.infer<typeof jiraImportSchema>;

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  key: keyof JiraImportResult['stats'];
  icon: React.ReactNode;
  color: string;
}

const STAT_ITEMS: StatItem[] = [
  { label: 'Statuses', key: 'statuses', icon: <BarChart3 className="h-5 w-5" />, color: 'text-primary-600 bg-primary-50' },
  { label: 'Sprints', key: 'sprints', icon: <Timer className="h-5 w-5" />, color: 'text-accent-600 bg-accent-50' },
  { label: 'Epics', key: 'epics', icon: <Layers className="h-5 w-5" />, color: 'text-purple-600 bg-purple-50' },
  { label: 'Issues', key: 'issues', icon: <ListTodo className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
  { label: 'Comments', key: 'comments', icon: <MessageSquare className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50' },
  { label: 'Labels', key: 'labels', icon: <Tag className="h-5 w-5" />, color: 'text-orange-600 bg-orange-50' },
  { label: 'Links', key: 'links', icon: <Link2 className="h-5 w-5" />, color: 'text-indigo-600 bg-indigo-50' },
  { label: 'Users Matched', key: 'usersMatched', icon: <Users className="h-5 w-5" />, color: 'text-success-500 bg-success-50' },
  { label: 'Users Missed', key: 'usersMissed', icon: <Users className="h-5 w-5" />, color: 'text-warning-600 bg-warning-50' },
];

// ---------------------------------------------------------------------------
// Helper: parse error message
// ---------------------------------------------------------------------------

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error.response?.status === 401) return 'Authentication failed. Check your email and API token.';
    if (error.response?.status === 403) return 'Access denied. Ensure the API token has sufficient permissions.';
    if (error.response?.status === 404) return 'Project not found. Verify the project key is correct.';
    if (error.response?.status === 429) return 'Rate limited by Jira. Please wait a moment and try again.';
    if (error.response?.status && error.response.status >= 500) return 'Jira server error. Please try again later.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred during import.';
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function JiraImportPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id ?? '';

  const [showApiToken, setShowApiToken] = useState(false);
  const [result, setResult] = useState<JiraImportResult | null>(null);

  // ---- Form ----
  const form = useForm<JiraImportFormValues>({
    resolver: zodResolver(jiraImportSchema),
    defaultValues: {
      jiraBaseUrl: '',
      jiraEmail: '',
      jiraApiToken: '',
      jiraProjectKey: '',
    },
  });

  // ---- Mutation ----
  const importMutation = useMutation({
    mutationFn: (data: JiraImportFormValues) =>
      jiraImportService.importProject({
        ...data,
        workspaceId,
      }),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  function onSubmit(data: JiraImportFormValues) {
    setResult(null);
    importMutation.mutate(data);
  }

  function handleReset() {
    setResult(null);
    importMutation.reset();
    form.reset();
    setShowApiToken(false);
  }

  function handleGoToProject() {
    if (result?.projectId) {
      navigate(`/board/${result.projectId}`);
    }
  }

  // ---- Determine current view ----
  const isImporting = importMutation.isPending;
  const isSuccess = importMutation.isSuccess && result !== null;
  const isError = importMutation.isError;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-lg">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Jira Import</h1>
              <p className="text-white/80 mt-1 text-sm">
                Import a project from Jira Cloud into Trackly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Connection Form (shown when idle or on error) */}
      {!isImporting && !isSuccess && (
        <Card>
          <div className="space-y-6">
            {/* Error Banner */}
            {isError && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-danger-50 border border-danger-200">
                <XCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-danger-800">
                    Import Failed
                  </h4>
                  <p className="text-sm text-danger-700 mt-1">
                    {getErrorMessage(importMutation.error)}
                  </p>
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-danger-700 mb-1">
                      Common causes:
                    </h5>
                    <ul className="text-xs text-danger-600 space-y-0.5 list-disc list-inside">
                      <li>Incorrect email or API token</li>
                      <li>Project key does not exist in your Jira instance</li>
                      <li>API token lacks the required permissions</li>
                      <li>Jira Cloud URL is incorrect or unreachable</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Form Header */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Connect to Jira
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Provide your Jira Cloud credentials and the project key you want to import.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Jira Cloud URL"
                placeholder="https://yourcompany.atlassian.net"
                error={form.formState.errors.jiraBaseUrl?.message}
                {...form.register('jiraBaseUrl')}
              />

              <Input
                label="Email Address"
                placeholder="user@company.com"
                type="email"
                error={form.formState.errors.jiraEmail?.message}
                {...form.register('jiraEmail')}
              />

              <div className="relative">
                <Input
                  label="API Token"
                  placeholder="ATATT3xFfGF0..."
                  type={showApiToken ? 'text' : 'password'}
                  error={form.formState.errors.jiraApiToken?.message}
                  {...form.register('jiraApiToken')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  className="absolute right-3 top-[34px] p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showApiToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Input
                label="Project Key"
                placeholder="PROJ"
                error={form.formState.errors.jiraProjectKey?.message}
                helperText="The short prefix used for issue IDs in Jira (e.g. PROJ-123)"
                {...form.register('jiraProjectKey')}
              />

              {/* API Token Help */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-blue-50 border border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-medium">Where to find your API token</p>
                  <p>
                    Go to{' '}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1 font-medium"
                    >
                      Atlassian API Tokens
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    and click &quot;Create API token&quot;. Use the email address associated
                    with your Atlassian account.
                  </p>
                </div>
              </div>

              {/* Workspace Info */}
              {!workspaceId && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-warning-50 border border-warning-200">
                  <AlertTriangle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-700">
                    No workspace selected. Please select a workspace from the sidebar
                    before importing.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!workspaceId}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Start Import
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Step 2: Importing */}
      {isImporting && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center">
                <Download className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Importing project from Jira...
              </h2>
              <p className="text-sm text-gray-500 max-w-md">
                We&apos;re fetching statuses, sprints, epics, issues, comments, and more
                from your Jira project. This may take a few minutes for large projects.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
              <span>Do not close this page</span>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Success */}
      {isSuccess && result && (
        <div className="space-y-6">
          {/* Success Banner */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-success-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Import Complete
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Successfully imported{' '}
                  <span className="font-medium text-gray-700">
                    {result.projectName}
                  </span>{' '}
                  ({result.projectKey}) into Trackly.
                </p>
              </div>
              <Badge variant="success">Success</Badge>
            </div>
          </Card>

          {/* Stats Grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Import Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {STAT_ITEMS.map((item) => {
                const value = result.stats[item.key];
                return (
                  <Card key={item.key} padding="none" className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.color
                        )}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          {value}
                        </p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-600" />
                Warnings ({result.warnings.length})
              </h3>
              <div className="space-y-2">
                {result.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-warning-50 border border-warning-200"
                  >
                    <AlertTriangle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-warning-800">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGoToProject}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Go to Project
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Import Another
            </Button>
          </div>
        </div>
      )}

      {/* Help Section */}
      {!isImporting && !isSuccess && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              What gets imported?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: <BarChart3 className="h-4 w-4" />, text: 'Issue statuses and workflow' },
                { icon: <Timer className="h-4 w-4" />, text: 'Sprints with dates and goals' },
                { icon: <Layers className="h-4 w-4" />, text: 'Epics and issue hierarchy' },
                { icon: <ListTodo className="h-4 w-4" />, text: 'All issue types (bugs, stories, tasks)' },
                { icon: <MessageSquare className="h-4 w-4" />, text: 'Comments on issues' },
                { icon: <Tag className="h-4 w-4" />, text: 'Labels and categories' },
                { icon: <Link2 className="h-4 w-4" />, text: 'Issue links and dependencies' },
                { icon: <Users className="h-4 w-4" />, text: 'User assignments (matched by email)' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 text-sm text-gray-600"
                >
                  <div className="flex-shrink-0 text-primary-500">
                    {item.icon}
                  </div>
                  {item.text}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Users are matched by email address. Any Jira users not found in Trackly
                will have their issues assigned to the importer. You can reassign these
                after import.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
