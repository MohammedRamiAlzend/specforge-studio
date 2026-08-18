export interface TeamMember {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberInput {
  project_id: string;
  name: string;
  email?: string | null;
  role?: string | null;
}

export interface UpdateTeamMemberInput {
  name?: string;
  email?: string | null;
  role?: string | null;
}
