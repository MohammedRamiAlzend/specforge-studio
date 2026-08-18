export type ReleaseStatus = "planned" | "in_progress" | "released" | "archived";

export interface Release {
  id: string;
  project_id: string;
  version: string;
  name: string;
  status: ReleaseStatus;
  notes: string;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReleaseInput {
  project_id: string;
  version: string;
  name: string;
  status?: ReleaseStatus;
  notes?: string;
  released_at?: string | null;
}

export interface UpdateReleaseInput {
  version?: string;
  name?: string;
  status?: ReleaseStatus;
  notes?: string | null;
  released_at?: string | null;
}
