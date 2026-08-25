export type BmcBlock =
  | "key_partners"
  | "key_activities"
  | "key_resources"
  | "value_propositions"
  | "customer_relationships"
  | "channels"
  | "customer_segments"
  | "cost_structure"
  | "revenue_streams";

/** One sticky-note item inside a canvas block. */
export interface BmcNote {
  id: string;
  project_id: string;
  block: BmcBlock;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBmcNoteInput {
  project_id: string;
  block: BmcBlock;
  content: string;
  sort_order?: number;
}

export interface UpdateBmcNoteInput {
  content?: string;
  sort_order?: number;
}
