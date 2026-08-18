import type { Issue, IssueFilters, IssueKind, IssueSeverity, IssueStatus } from "./types";

export const ISSUE_KINDS: IssueKind[] = ["bug", "enhancement", "tech_debt", "question"];
export const ISSUE_SEVERITIES: IssueSeverity[] = ["low", "medium", "high", "critical"];
export const ISSUE_STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "closed"];

export const ISSUE_KIND_COLORS: Record<IssueKind, string> = {
  bug: "text-rose-600",
  enhancement: "text-emerald-600",
  tech_debt: "text-amber-600",
  question: "text-sky-600",
};

export const ISSUE_SEVERITY_COLORS: Record<IssueSeverity, string> = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-orange-600",
  critical: "text-rose-600",
};

export function issueKindLabel(kind: IssueKind): string {
  return kind.replace(/_/g, " ");
}

export function issueSeverityLabel(severity: IssueSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

/** Next sensible status when moving an issue forward through its lifecycle. */
export function nextIssueStatus(status: IssueStatus): IssueStatus | null {
  switch (status) {
    case "open":
      return "in_progress";
    case "in_progress":
      return "resolved";
    case "resolved":
      return "closed";
    default:
      return null;
  }
}

export function applyIssueFilters(issues: Issue[] | undefined, filters: IssueFilters): Issue[] {
  if (!issues) return [];
  return issues.filter(
    (issue) =>
      (!filters.status || issue.status === filters.status) &&
      (!filters.kind || issue.kind === filters.kind),
  );
}
