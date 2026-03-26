import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace.store';
import { workspaceService } from '@/services/workspace.service';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Workspace } from '@/types';

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

type CreateWorkspaceForm = z.infer<typeof createWorkspaceSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

interface WorkspaceSelectorProps {
  collapsed?: boolean;
}

export function WorkspaceSelector({ collapsed = false }: WorkspaceSelectorProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace, setCurrentWorkspace, setWorkspaces } = useWorkspaceStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.list,
  });

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(workspaces[0]);
      setWorkspaces(workspaces);
    } else if (workspaces) {
      setWorkspaces(workspaces);
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace, setWorkspaces]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkspaceForm) =>
      workspaceService.create({ name: data.name, slug: slugify(data.name + '-' + Date.now()) }),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCurrentWorkspace(workspace);
      setShowCreateModal(false);
      form.reset();
    },
  });

  const form = useForm<CreateWorkspaceForm>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '' },
  });

  function handleSelect(workspace: Workspace) {
    setCurrentWorkspace(workspace);
    setShowDropdown(false);
  }

  if (collapsed) {
    return (
      <div className="px-3 py-2">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-primary-50 text-primary-600"
          title={currentWorkspace?.name ?? 'Select workspace'}
        >
          <Building2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50/80 hover:bg-primary-50 text-left transition-colors"
      >
        <Building2 className="h-4 w-4 text-primary-500 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-gray-900 truncate">
          {currentWorkspace?.name ?? 'Select Workspace'}
        </span>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 text-gray-400 transition-transform',
          showDropdown && 'rotate-180'
        )} />
      </button>

      {showDropdown && (
        <div className="absolute left-3 right-3 z-50 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-64 overflow-y-auto">
          {(workspaces ?? []).map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors',
                ws.id === currentWorkspace?.id && 'bg-primary-50/50'
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === currentWorkspace?.id && (
                <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />
              )}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                setShowDropdown(false);
                setShowCreateModal(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Workspace
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          form.reset();
        }}
        title="Create Workspace"
      >
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. My Team"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
