import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plug,
  Github,
  MessageSquare,
  FileText,
  GitBranch,
  GitMerge,
  Zap,
  Download,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  integrationService,
  type IntegrationEntry,
} from '@/services/integration.service';
import { useWorkspaceStore } from '@/store/workspace.store';
import { cn } from '@/utils/cn';

// ---------------------------------------------------------------------------
// Integration type definitions
// ---------------------------------------------------------------------------

type IntegrationType = 'GITHUB' | 'CONFLUENCE' | 'SLACK' | 'JIRA' | 'BITBUCKET' | 'GITLAB';

interface IntegrationTemplate {
  type: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: { key: string; label: string; placeholder: string; isSecret?: boolean }[];
}

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    type: 'GITHUB',
    name: 'GitHub',
    description: 'Connect repositories, sync pull requests and issues.',
    icon: <Github className="h-6 w-6" />,
    color: 'bg-gray-900 text-white',
    fields: [
      { key: 'repositoryUrl', label: 'Repository URL', placeholder: 'https://github.com/org/repo' },
      { key: 'personalAccessToken', label: 'Personal Access Token', placeholder: 'ghp_...', isSecret: true },
      { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'Secret key for webhooks', isSecret: true },
    ],
  },
  {
    type: 'CONFLUENCE',
    name: 'Confluence',
    description: 'Link documentation pages to issues and projects.',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-blue-600 text-white',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://yourorg.atlassian.net/wiki' },
      { key: 'username', label: 'Username', placeholder: 'user@example.com' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your Confluence API token', isSecret: true },
      { key: 'spaceKey', label: 'Space Key', placeholder: 'e.g. PROJ' },
    ],
  },
  {
    type: 'SLACK',
    name: 'Slack',
    description: 'Get notifications and updates in Slack channels.',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'bg-purple-600 text-white',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channel', label: 'Channel', placeholder: '#project-updates' },
      { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', isSecret: true },
    ],
  },
  {
    type: 'JIRA',
    name: 'Jira',
    description: 'Import and sync issues with Jira projects.',
    icon: <Zap className="h-6 w-6" />,
    color: 'bg-blue-500 text-white',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://yourorg.atlassian.net' },
      { key: 'email', label: 'Email', placeholder: 'user@example.com' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your Jira API token', isSecret: true },
      { key: 'projectKey', label: 'Project Key', placeholder: 'e.g. PROJ' },
    ],
  },
  {
    type: 'BITBUCKET',
    name: 'Bitbucket',
    description: 'Connect Bitbucket repositories and track commits.',
    icon: <GitBranch className="h-6 w-6" />,
    color: 'bg-blue-700 text-white',
    fields: [
      { key: 'workspace', label: 'Workspace', placeholder: 'Your Bitbucket workspace' },
      { key: 'repository', label: 'Repository', placeholder: 'Repository slug' },
      { key: 'appPassword', label: 'App Password', placeholder: 'Your app password', isSecret: true },
    ],
  },
  {
    type: 'GITLAB',
    name: 'GitLab',
    description: 'Connect GitLab instances, sync MRs and issues.',
    icon: <GitMerge className="h-6 w-6" />,
    color: 'bg-orange-600 text-white',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', placeholder: 'https://gitlab.com' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Your GitLab access token', isSecret: true },
      { key: 'projectId', label: 'Project ID', placeholder: 'Numeric project ID' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const configSchema = z.record(z.string(), z.string().min(1, 'Required'));

const createIntegrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  config: configSchema,
});

type CreateIntegrationFormValues = z.infer<typeof createIntegrationSchema>;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function IntegrationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id ?? '';

  const [configuringType, setConfiguringType] = useState<IntegrationType | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationEntry | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // ---- Queries ----
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', workspaceId],
    queryFn: () => integrationService.list(workspaceId),
    enabled: !!workspaceId,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: { type: string; name: string; config: Record<string, string>; workspaceId: string }) =>
      integrationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] });
      setConfiguringType(null);
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; config?: Record<string, string>; enabled?: boolean } }) =>
      integrationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] });
      setEditingIntegration(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationService.testConnection(id),
    onSuccess: (data, id) => {
      setTestResult({ id, ...data });
    },
    onError: (_err, id) => {
      setTestResult({ id, success: false, message: 'Connection test failed. Check your credentials.' });
    },
  });

  // ---- Forms ----
  const createForm = useForm<CreateIntegrationFormValues>({
    resolver: zodResolver(createIntegrationSchema),
    defaultValues: { name: '', config: {} },
  });

  // ---- Helpers ----
  const connectedTypes = new Set(integrations?.map((i) => i.type) ?? []);
  const selectedTemplate = INTEGRATION_TEMPLATES.find((t) => t.type === configuringType) ?? null;
  const editingTemplate = editingIntegration
    ? INTEGRATION_TEMPLATES.find((t) => t.type === editingIntegration.type) ?? null
    : null;

  function getIntegrationForType(type: IntegrationType): IntegrationEntry | undefined {
    return integrations?.find((i) => i.type === type);
  }

  function handleOpenConfigure(type: IntegrationType) {
    const existing = getIntegrationForType(type);
    if (existing) {
      setEditingIntegration(existing);
    } else {
      const template = INTEGRATION_TEMPLATES.find((t) => t.type === type);
      if (!template) return;
      const defaultConfig: Record<string, string> = {};
      for (const field of template.fields) {
        defaultConfig[field.key] = '';
      }
      createForm.reset({ name: template.name, config: defaultConfig });
      setConfiguringType(type);
    }
  }

  function onCreateSubmit(data: CreateIntegrationFormValues) {
    if (!configuringType || !workspaceId) return;
    createMutation.mutate({
      type: configuringType,
      name: data.name,
      config: data.config,
      workspaceId,
    });
  }

  function handleToggle(integration: IntegrationEntry) {
    updateMutation.mutate({
      id: integration.id,
      data: { enabled: !integration.enabled },
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-header rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-white/80 mt-1 text-sm">
              Connect external tools and services to your workspace
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="space-y-3">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : !workspaceId ? (
        <Card>
          <EmptyState
            icon={<Plug className="h-8 w-8" />}
            title="No workspace selected"
            description="Select a workspace to manage integrations."
          />
        </Card>
      ) : (
        /* Integration Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATION_TEMPLATES.map((template) => {
            const connected = connectedTypes.has(template.type);
            const integration = getIntegrationForType(template.type);
            const isEnabled = integration?.enabled ?? false;
            const isTestingThis =
              testMutation.isPending && testMutation.variables === integration?.id;
            const testResultForThis =
              testResult && testResult.id === integration?.id ? testResult : null;

            return (
              <Card key={template.type} hoverable className="relative">
                <div className="flex flex-col h-full">
                  {/* Icon + Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn('p-3 rounded-lg', template.color)}>
                      {template.icon}
                    </div>
                    {connected && (
                      <div className="flex items-center gap-2">
                        <Badge variant={isEnabled ? 'success' : 'default'}>
                          {isEnabled ? 'Connected' : 'Disabled'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Name + Description */}
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4 flex-1">
                    {template.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {connected && integration ? (
                      <>
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(integration)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title={isEnabled ? 'Disable' : 'Enable'}
                        >
                          {isEnabled ? (
                            <ToggleRight className="h-5 w-5 text-success-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>

                        {/* Configure */}
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Settings className="h-3.5 w-3.5" />}
                          onClick={() => handleOpenConfigure(template.type)}
                        >
                          Configure
                        </Button>

                        {/* Test */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testMutation.mutate(integration.id)}
                          isLoading={isTestingThis}
                        >
                          Test
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="h-3.5 w-3.5 text-danger-600" />}
                          onClick={() => deleteMutation.mutate(integration.id)}
                          isLoading={
                            deleteMutation.isPending &&
                            deleteMutation.variables === integration.id
                          }
                        />
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => handleOpenConfigure(template.type)}
                      >
                        Connect
                      </Button>
                    )}

                    {/* Import Project button for Jira */}
                    {template.type === 'JIRA' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                        onClick={() => navigate('/jira-import')}
                      >
                        Import Project
                      </Button>
                    )}
                  </div>

                  {/* Test result */}
                  {testResultForThis && (
                    <div
                      className={cn(
                        'mt-3 p-2 rounded-lg text-xs flex items-center gap-2',
                        testResultForThis.success
                          ? 'bg-success-50 text-success-500'
                          : 'bg-danger-50 text-danger-600'
                      )}
                    >
                      {testResultForThis.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      {testResultForThis.message}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Integration Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!configuringType}
          onClose={() => {
            setConfiguringType(null);
            createForm.reset();
          }}
          title={`Connect ${selectedTemplate.name}`}
          size="lg"
        >
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
            <Input
              label="Display Name"
              placeholder={selectedTemplate.name}
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />

            {selectedTemplate.fields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                type={field.isSecret ? 'password' : 'text'}
                error={
                  (createForm.formState.errors.config as Record<string, { message?: string }> | undefined)?.[
                    field.key
                  ]?.message
                }
                {...createForm.register(`config.${field.key}`)}
              />
            ))}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setConfiguringType(null);
                  createForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Connect
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Integration Modal */}
      {editingIntegration && editingTemplate && (
        <Modal
          isOpen={!!editingIntegration}
          onClose={() => setEditingIntegration(null)}
          title={`Configure ${editingTemplate.name}`}
          size="lg"
        >
          <EditIntegrationForm
            integration={editingIntegration}
            template={editingTemplate}
            onSave={(config) => {
              updateMutation.mutate({
                id: editingIntegration.id,
                data: { config },
              });
            }}
            onCancel={() => setEditingIntegration(null)}
            isSaving={updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Form sub-component
// ---------------------------------------------------------------------------

interface EditIntegrationFormProps {
  integration: IntegrationEntry;
  template: IntegrationTemplate;
  onSave: (config: Record<string, string>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EditIntegrationForm({
  integration,
  template,
  onSave,
  onCancel,
  isSaving,
}: EditIntegrationFormProps) {
  const editSchema = z.object({
    config: z.record(z.string(), z.string().min(1, 'Required')),
  });

  type EditFormValues = z.infer<typeof editSchema>;

  const defaultConfig: Record<string, string> = {};
  for (const field of template.fields) {
    defaultConfig[field.key] = integration.config[field.key] ?? '';
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { config: defaultConfig },
  });

  function onSubmit(data: EditFormValues) {
    onSave(data.config);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {template.fields.map((field) => (
        <Input
          key={field.key}
          label={field.label}
          placeholder={field.placeholder}
          type={field.isSecret ? 'password' : 'text'}
          error={
            (errors.config as Record<string, { message?: string }> | undefined)?.[
              field.key
            ]?.message
          }
          {...register(`config.${field.key}`)}
        />
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving}>
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
