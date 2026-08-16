export interface PlatformLibrary {
  id: string;
  stack_id: string;
  name: string;
  purpose: string | null;
  category: string | null;
  url: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformStack {
  id: string;
  type_id: string;
  name: string;
  language: string | null;
  description: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
  libraries: PlatformLibrary[];
}

export interface PlatformType {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  enabled: number;
  built_in: number;
  created_at: string;
  updated_at: string;
  stacks: PlatformStack[];
}

export interface CreateProjectTypeInput {
  key: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateProjectTypeInput {
  key?: string;
  label?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  sort_order?: number;
  enabled?: boolean;
}

export interface CreateStackInput {
  type_id: string;
  name: string;
  language?: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateStackInput {
  name?: string;
  language?: string | null;
  description?: string | null;
  sort_order?: number;
  enabled?: boolean;
}

export interface CreateLibraryInput {
  stack_id: string;
  name: string;
  purpose?: string;
  category?: string;
  url?: string;
  sort_order?: number;
}

export interface UpdateLibraryInput {
  name?: string;
  purpose?: string | null;
  category?: string | null;
  url?: string | null;
  sort_order?: number;
  enabled?: boolean;
}
