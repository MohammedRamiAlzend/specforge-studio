export interface Workflow {
  id: string;
  project_id: string;
  module_id: string | null;
  name: string;
  description: string | null;
  start_node_id: string | null;
  end_node_id: string | null;
  owner_role: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowInput {
  project_id: string;
  module_id?: string;
  name: string;
  description?: string;
  owner_role?: string;
}
