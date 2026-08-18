export type IssueKind = "bug" | "enhancement" | "tech_debt" | "question";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Issue {
  id: string;
  project_id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  requirement_id: string | null;
  task_id: string | null;
  test_case_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIssueInput {
  project_id: string;
  kind: IssueKind;
  severity?: IssueSeverity;
  title: string;
  description?: string;
  requirement_id?: string | null;
  task_id?: string | null;
  test_case_id?: string | null;
  created_by?: string | null;
}

export interface UpdateIssueInput {
  kind?: IssueKind;
  severity?: IssueSeverity;
  status?: IssueStatus;
  title?: string;
  description?: string | null;
  requirement_id?: string | null;
  task_id?: string | null;
  test_case_id?: string | null;
  created_by?: string | null;
}

export interface IssueFilters {
  status?: IssueStatus;
  kind?: IssueKind;
}
