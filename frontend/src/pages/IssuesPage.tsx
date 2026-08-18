import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCreateIssue, useDeleteIssue, useIssues, useUpdateIssue } from "../entities/issue/api";
import {
  ISSUE_KINDS,
  ISSUE_SEVERITIES,
  ISSUE_KIND_COLORS,
  ISSUE_SEVERITY_COLORS,
  issueKindLabel,
  issueSeverityLabel,
  nextIssueStatus,
  applyIssueFilters,
} from "../entities/issue/lib";
import type { Issue, IssueFilters, IssueKind, IssueSeverity } from "../entities/issue/types";
import { Button } from "../shared/ui/Button";
import { Card, CardHeader } from "../shared/ui/Card";
import { PageHeader } from "../shared/ui/PageHeader";
import { EmptyState } from "../shared/ui/States";
import { Spinner } from "../shared/ui/Spinner";
import { StatusBadge } from "../shared/ui/Badge";
import { formatDate } from "../shared/lib/format";
import { errorMessage } from "../shared/api/client";

const fieldClass =
  "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

interface Draft {
  kind: IssueKind;
  severity: IssueSeverity;
  title: string;
  description: string;
}

const emptyDraft: Draft = { kind: "bug", severity: "medium", title: "", description: "" };

export function IssuesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filters, setFilters] = useState<IssueFilters>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const { data: allIssues, isLoading, error, refetch } = useIssues(projectId);
  const createIssue = useCreateIssue(projectId);
  const updateIssue = useUpdateIssue(projectId);
  const deleteIssue = useDeleteIssue(projectId);

  const issues = applyIssueFilters(allIssues, filters);

  const submit = () => {
    if (!draft || !projectId || !draft.title.trim()) return;
    createIssue.mutate(
      {
        kind: draft.kind,
        severity: draft.severity,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const advance = (issue: Issue) => {
    const next = nextIssueStatus(issue.status);
    if (next) updateIssue.mutate({ id: issue.id, status: next });
  };

  const mutationError = createIssue.isError
    ? errorMessage(createIssue.error)
    : updateIssue.isError
      ? errorMessage(updateIssue.error)
      : deleteIssue.isError
        ? errorMessage(deleteIssue.error)
        : null;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Issues" description="Bugs, enhancements, tech debt, and questions." />
        <div className="text-sm text-rose-600">
          {error.message}
          <button className="ml-2 underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issues"
        description="Track defects, enhancements, tech debt, and questions through resolution."
        actions={
          <Button size="sm" onClick={() => setDraft((d) => (d ? null : { ...emptyDraft }))}>
            {draft ? "Cancel" : "New issue"}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Status
            <select
              className={fieldClass}
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value ? (e.target.value as IssueFilters["status"]) : undefined }))
              }
              aria-label="Filter by status"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Kind
            <select
              className={fieldClass}
              value={filters.kind ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, kind: e.target.value ? (e.target.value as IssueFilters["kind"]) : undefined }))
              }
              aria-label="Filter by kind"
            >
              <option value="">All</option>
              {ISSUE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {issueKindLabel(kind)}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto font-mono text-[11px] text-slate-400">
            {issues.length} of {allIssues?.length ?? 0}
          </span>
        </div>
      </Card>

      {draft ? (
        <Card>
          <CardHeader title="New issue" description="Report a bug, request an enhancement, or record tech debt." />
          <div className="grid gap-3 px-5 py-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className={fieldClass}
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as IssueKind })}
                aria-label="Issue kind"
              >
                {ISSUE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {issueKindLabel(kind)}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as IssueSeverity })}
                aria-label="Issue severity"
              >
                {ISSUE_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {issueSeverityLabel(severity)}
                  </option>
                ))}
              </select>
              <input
                className={fieldClass}
                placeholder="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                aria-label="Issue title"
              />
            </div>
            <textarea
              className={`${fieldClass} resize-none`}
              rows={2}
              placeholder="Description (optional)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              aria-label="Issue description"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" loading={createIssue.isPending} disabled={draft.title.trim() === ""} onClick={submit}>
                Create issue
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {mutationError ? <p className="text-xs text-rose-600">{mutationError}</p> : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !allIssues || allIssues.length === 0 ? (
        <EmptyState
          title="No issues yet"
          hint="Report bugs, request enhancements, or record tech debt. Issues can be linked to requirements and tasks."
          actionLabel="New issue"
          onAction={() => setDraft({ ...emptyDraft })}
        />
      ) : issues.length === 0 ? (
        <EmptyState title="No issues match these filters" hint="Try clearing the status or kind filter." />
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{issue.id}</span>
                    <span className={`text-xs font-medium capitalize ${ISSUE_KIND_COLORS[issue.kind] ?? ""}`}>
                      {issueKindLabel(issue.kind)}
                    </span>
                    <span className={`text-[11px] font-medium ${ISSUE_SEVERITY_COLORS[issue.severity] ?? ""}`}>
                      {issueSeverityLabel(issue.severity)}
                    </span>
                    <StatusBadge status={issue.status} />
                  </div>
                  <h3 className="mt-1.5 text-sm font-medium text-slate-900">{issue.title}</h3>
                  {issue.description ? <p className="mt-1 text-xs text-slate-500">{issue.description}</p> : null}
                  <p className="mt-2 text-[11px] text-slate-400">
                    Created {formatDate(issue.created_at)}
                    {issue.created_by ? ` · ${issue.created_by}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" disabled={!nextIssueStatus(issue.status)} onClick={() => advance(issue)}>
                    Advance →
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteIssue.mutate(issue.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
