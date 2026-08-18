export interface ActivityItem {
  id: number;
  project_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor: string | null;
  actor_type: string;
  payload: unknown;
  created_at: string;
  pending?: boolean;
}
