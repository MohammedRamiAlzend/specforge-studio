export interface DataEntity {
  id: string;
  project_id: string;
  module_id: string | null;
  name: string;
  table_name: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDataEntityInput {
  project_id: string;
  module_id?: string;
  name: string;
  table_name?: string;
  description?: string;
}
