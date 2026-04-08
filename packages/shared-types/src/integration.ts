import { IntegrationType } from './enums';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationRequest {
  type: IntegrationType;
  name: string;
  config: Record<string, string>;
  workspaceId: string;
}

export interface UpdateIntegrationRequest {
  name?: string;
  config?: Record<string, string>;
  enabled?: boolean;
}
