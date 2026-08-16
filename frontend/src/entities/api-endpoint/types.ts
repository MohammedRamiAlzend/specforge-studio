export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  id: string;
  project_id: string;
  module_id: string | null;
  method: HttpMethod;
  path: string;
  purpose: string | null;
  auth: string | null;
  request_schema: string | null;
  response_schema: string | null;
  error_codes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApiEndpointInput {
  project_id: string;
  module_id?: string;
  method: HttpMethod;
  path: string;
  purpose?: string;
  auth?: string;
  request_schema?: Record<string, unknown>;
  response_schema?: Record<string, unknown>;
  error_codes?: { code: string; description: string }[];
}
