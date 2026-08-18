export interface SearchResult {
  type: string;
  id: string;
  title: string;
  project_id: string | null;
}

export const SEARCHABLE_TYPES = [
  "project",
  "module",
  "requirement",
  "use_case",
  "workflow",
  "entity",
  "api_endpoint",
  "screen",
  "task",
  "issue",
  "release",
  "skill",
  "team_member",
] as const;

export type SearchableType = (typeof SEARCHABLE_TYPES)[number];

export function searchTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}
