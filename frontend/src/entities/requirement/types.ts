export type RequirementType = "functional" | "nonfunctional" | "constraint" | "data";
export type RequirementPriority = "must" | "should" | "could" | "wont";

export interface Requirement {
  id: string;
  project_id: string;
  module_id: string | null;
  title: string;
  type: RequirementType;
  priority: RequirementPriority;
  criticality: "critical" | "normal";
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRequirementInput {
  project_id: string;
  module_id?: string;
  title: string;
  type?: RequirementType;
  priority?: RequirementPriority;
  criticality?: "critical" | "normal";
  description?: string;
  acceptance_criteria?: string;
}
