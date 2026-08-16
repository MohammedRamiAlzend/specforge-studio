export type SkillKind = "capability" | "tech";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Skill {
  id: string;
  project_id: string;
  kind: SkillKind;
  name: string;
  description: string;
  level: SkillLevel | null;
  tag: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillInput {
  project_id: string;
  kind: SkillKind;
  name: string;
  description?: string;
  level?: SkillLevel | null;
  tag?: string | null;
  sort_order?: number;
}

export interface UpdateSkillInput {
  kind?: SkillKind;
  name?: string;
  description?: string | null;
  level?: SkillLevel | null;
  tag?: string | null;
  sort_order?: number;
}

export interface SkillFormState {
  openKind: SkillKind | null;
  editingId: string | null;
  kind: SkillKind;
  name: string;
  description: string;
  level: SkillLevel;
  tag: string;
  sortOrder: number;
}