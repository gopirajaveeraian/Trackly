import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Trash2,
  Columns3,
  List,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService } from '@/services/project.service';
import { useWorkspaceStore } from '@/store/workspace.store';
import { cn } from '@/utils/cn';
import { ProjectType } from '@/types';
import type { Project, CreateProjectRequest } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters')
    .max(5, 'Key must be at most 5 characters')
    .regex(/^[A-Z]+$/, 'Key must be uppercase letters only'),
  description: z.string().optional(),
  type: z.nativeEnum(ProjectType),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', currentWorkspace?.id],
    queryFn: () =>
      currentWorkspace
        ? projectService.list(currentWorkspace.id)
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 10, hasMore: false }),
    enabled: !!currentWorkspace,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => projectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateModal(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      type: ProjectType.KANBAN,
    },
  });

  const selectedType = watch('type');

  function onSubmit(data: CreateProjectFormValues) {
    if (!currentWorkspace) return;
    createMutation.mutate({
      ...data,
      workspaceId: currentWorkspace.id,
    });
  }

  // Auto-generate key from name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    register('name').onChange(e);
    const key = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 5);
    if (key) {
      setValue('key', key);
    }
  }

  const projectList = projects?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your projects and track progress
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </Card>
          ))}
        </div>
      ) : projectList.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects yet"
            description="Create your first project to start tracking issues and managing your team's work."
            actionLabel="Create Project"
            onAction={() => setShowCreateModal(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((project: Project) => (
            <Card
              key={project.id}
              hoverable
              className="cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-50 text-primary-600 font-bold text-sm">
                    {project.key}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {project.name}
                    </h3>
                    <Badge
                      variant={
                        project.type === ProjectType.SCRUM
                          ? 'accent'
                          : 'primary'
                      }
                    >
                      {project.type}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(project.id);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Delete project"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {project.description && (
                <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>
                  Created{' '}
                  {formatDistanceToNow(new Date(project.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/board/${project.id}`);
                    }}
                    className="p-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    title="Board view"
                  >
                    <Columns3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/backlog/${project.id}`);
                    }}
                    className="p-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    title="Backlog view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
        title="Create New Project"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Project Name"
            placeholder="My Awesome Project"
            error={errors.name?.message}
            {...register('name')}
            onChange={handleNameChange}
          />

          <Input
            label="Project Key"
            placeholder="MAP"
            helperText="A short identifier for issues (e.g., MAP-123)"
            error={errors.key?.message}
            {...register('key')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Project Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('type', ProjectType.KANBAN)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-colors',
                  selectedType === ProjectType.KANBAN
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Columns3
                  className={cn(
                    'h-5 w-5 mb-2',
                    selectedType === ProjectType.KANBAN
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  )}
                />
                <p className="text-sm font-medium text-gray-900">Kanban</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Continuous flow with columns
                </p>
              </button>
              <button
                type="button"
                onClick={() => setValue('type', ProjectType.SCRUM)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-colors',
                  selectedType === ProjectType.SCRUM
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <List
                  className={cn(
                    'h-5 w-5 mb-2',
                    selectedType === ProjectType.SCRUM
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  )}
                />
                <p className="text-sm font-medium text-gray-900">Scrum</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sprint-based development
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Describe what this project is about..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this project? This action cannot be
            undone and all associated issues will be permanently removed.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deletingId) deleteMutation.mutate(deletingId);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
