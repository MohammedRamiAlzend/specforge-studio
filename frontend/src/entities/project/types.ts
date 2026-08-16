export type ProjectType = "web" | "mobile" | "api" | "ai";
export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export interface ProjectLibrarySelection {
  id: string;
  name: string;
  purpose: string | null;
  category: string | null;
}

export interface ProjectTypeSelection {
  type_id: string;
  key: string;
  label: string;
  color: string | null;
  icon: string | null;
  stack_id: string | null;
  stack_name: string | null;
  stack_language: string | null;
  libraries: ProjectLibrarySelection[];
}

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
  types?: ProjectTypeSelection[];
}

/** One per selected project type: optional chosen stack + libraries of it. */
export interface ProjectTypeDraft {
  type_id: string;
  stack_id?: string | null;
  library_ids?: string[];
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  description?: string;
  repository_url?: string;
  created_by: string;
  types?: ProjectTypeDraft[];
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  description?: string | null;
  repository_url?: string | null;
  status?: ProjectStatus;
  types?: ProjectTypeDraft[];
}