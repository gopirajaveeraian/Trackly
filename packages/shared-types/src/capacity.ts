export interface Capacity {
  id: string;
  userId: string;
  sprintId: string;
  availableHours: number;
  allocatedHours: number;
  user?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface UpsertCapacityRequest {
  userId: string;
  sprintId: string;
  availableHours: number;
}
