export type ProjectType = "web" | "mobile" | "api" | "ai";
export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  description: string | null;
  repository_url: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  description?: string;
  repository_url?: string;
  created_by: string;
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  description?: string | null;
  repository_url?: string | null;
  status?: ProjectStatus;
}
