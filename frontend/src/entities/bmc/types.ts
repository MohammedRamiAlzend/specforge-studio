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
export type BmcNoteColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export interface BmcNote {
  id: string;
  project_id: string;
  block: BmcBlock;
  content: string;
  sort_order: number;
  position_x?: number;
  position_y?: number;
  color?: BmcNoteColor;
  created_at: string;
  updated_at: string;
}

export interface CreateBmcNoteInput {
  project_id: string;
  block: BmcBlock;
  content: string;
  sort_order?: number;
  position_x?: number;
  position_y?: number;
  color?: BmcNoteColor;
}

export interface UpdateBmcNoteInput {
  block?: BmcBlock;
  content?: string;
  sort_order?: number;
  position_x?: number;
  position_y?: number;
  color?: BmcNoteColor;
}
