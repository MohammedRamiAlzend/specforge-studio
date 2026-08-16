import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useApprovals,
  useAudit,
  useCreateApproval,
  useDecideApproval,
  useGovernanceStatuses,
  useGovernanceStatus,
  useTraceability,
  useTransitionStatus,
  useValidationReport,
} from "../../entities/governance/api";
import type { GovernanceStatus } from "../../entities/governance/types";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";
import { EmptyState, ErrorState } from "../../shared/ui/States";
import { Spinner } from "../../shared/ui/Spinner";
import { formatDate } from "../../shared/lib/format";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

const ARTIFACT_TYPES = [
  "module",
  "requirement",
  "use_case",
  "workflow",
  "screen",
  "entity",
  "component",
  "api_endpoint",
  "test_case",
  "risk",
  "decision",
  "milestone",
  "task",
  "model_graph",
  "generated_diagram",
  "docs_export",
  "roadmap",
];

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  auto_generated: "border-sky-200 bg-sky-50 text-sky-700",
  needs_review: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready_for_agent: "border-violet-200 bg-violet-50 text-violet-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  needs_verification: "border-orange-200 bg-orange-50 text-orange-700",
  done: "border-teal-200 bg-teal-50 text-teal-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// --- Status lifecycle tab ---------------------------------------------------

function StatusTab({ projectId }: { projectId: string }) {
  const { data: registry } = useGovernanceStatuses();
  const [artifactType, setArtifactType] = useState("requirement");
  const [artifactId, setArtifactId] = useState("");
  const [toStatus, setToStatus] = useState<GovernanceStatus>("needs_review");
  const [message, setMessage] = useState<string | null>(null);

  const { data: statusInfo, isLoading: statusLoading, refetch } = useGovernanceStatus(artifactType, artifactId);
  const transition = useTransitionStatus();

  const gated = Boolean(statusInfo?.needs_approval);
  const allowedNext = statusInfo?.allowed_next ?? [];

  const handleTransition = async () => {
    setMessage(null);
    try {
      const result = await transition.mutateAsync({ artifact_type: artifactType, artifact_id: artifactId, to_status: toStatus });
      setMessage(`Moved ${result.artifact_id} ${result.from_status} → ${result.to_status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transition failed");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Status lifecycle"
        description="The canonical governance lifecycle: draft → auto_generated → needs_review → approved → ready_for_agent → in_progress → needs_verification → done (rejected branches off). Final requirements, architecture, data model, API contracts, security workflows, and production decisions need an approved APR to reach approved."
      />
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Artifact type</span>
          <select
            className={inputClass}
            value={artifactType}
            onChange={(e) => {
              setArtifactType(e.target.value);
              setArtifactId("");
              setMessage(null);
            }}
          >
            {ARTIFACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Artifact ID</span>
          <input
            className={inputClass}
            value={artifactId}
            placeholder="e.g. REQ-0001"
            onChange={(e) => {
              setArtifactId(e.target.value);
              setMessage(null);
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Target status</span>
          <select className={inputClass} value={toStatus} onChange={(e) => setToStatus(e.target.value as GovernanceStatus)}>
            {registry?.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button className="w-full" loading={transition.isPending} disabled={!artifactId} onClick={() => void handleTransition()}>
            Transition
          </Button>
        </div>
      </div>

      {artifactId ? (
        <div className="border-t border-slate-100 px-5 py-4">
          {statusLoading ? (
            <Spinner className="h-4 w-4 text-slate-400" />
          ) : statusInfo ? (
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-slate-400">{statusInfo.artifact_id}</span>
                <span className="text-slate-500">current:</span>
                <StatusChip status={statusInfo.status} />
                {gated ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                    approval gate
                  </span>
                ) : null}
                {statusInfo.approval_id ? (
                  <span className="font-mono text-[10px] text-emerald-600">APR {statusInfo.approval_id}</span>
                ) : null}
              </div>
              <p className="text-slate-500">
                Allowed next:{" "}
                {allowedNext.length > 0 ? allowedNext.map((s) => <StatusChip key={s} status={s} />) : <span className="italic">terminal state</span>}
              </p>
              {message ? (
                <p className={`rounded-md px-3 py-2 ${transition.isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p>
              ) : null}
            </div>
          ) : null}
          {!statusLoading && !statusInfo && !transition.isPending ? (
            <p className="text-xs text-slate-400">Enter an artifact ID to load its governance status. Refresh after a transition.</p>
          ) : null}
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => void refetch()}>
            Refresh status
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

// --- Approvals tab -----------------------------------------------------------

function ApprovalsTab({ projectId }: { projectId: string }) {
  const { data: approvals, isLoading, error, refetch } = useApprovals(projectId);
  const createApproval = useCreateApproval();
  const decideApproval = useDecideApproval();

  const [artifactType, setArtifactType] = useState("requirement");
  const [artifactId, setArtifactId] = useState("");
  const [approverRole, setApproverRole] = useState("product");
  const [comments, setComments] = useState("");
  const [rejectReason, setRejectReason] = useState<string>("");

  const handleCreate = async () => {
    await createApproval.mutateAsync({
      project_id: projectId,
      artifact_id: artifactId,
      artifact_type: artifactType,
      approver_role: approverRole,
      comments: comments.trim() || undefined,
    });
    setArtifactId("");
    setComments("");
  };

  const handleDecide = async (id: string, decision: "approved" | "rejected") => {
    await decideApproval.mutateAsync({
      id,
      decision,
      approver_role: approverRole,
      comments: decision === "rejected" ? rejectReason : comments || undefined,
    });
    setRejectReason("");
  };

  const pending = (approvals ?? []).filter((a) => a.status === "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Request approval" description="Create an approval request (APR) for an artifact. Decisions are recorded with role, name, and reason." />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Artifact type</span>
            <select className={inputClass} value={artifactType} onChange={(e) => setArtifactType(e.target.value)}>
              {ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Artifact ID</span>
            <input className={inputClass} value={artifactId} placeholder="e.g. REQ-0001" onChange={(e) => setArtifactId(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Approver role</span>
            <input className={inputClass} value={approverRole} onChange={(e) => setApproverRole(e.target.value)} />
          </label>
          <div className="flex items-end">
            <Button className="w-full" loading={createApproval.isPending} disabled={!artifactId} onClick={() => void handleCreate()}>
              Request approval
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Approval records${pending.length > 0 ? ` · ${pending.length} pending` : ""}`} description="Decisions are final; rejections must carry a reason." />
        <div className="space-y-3 px-5 py-4">
          {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
          {isLoading || !approvals ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5 text-slate-400" />
            </div>
          ) : approvals.length === 0 ? (
            <EmptyState title="No approval records yet" hint="Request an approval above. Final requirements, architecture, data model, and API contracts require one." />
          ) : (
            approvals.map((approval) => (
              <div key={approval.id} className="rounded-md border border-slate-100 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{approval.id}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {approval.artifact_id} ({approval.artifact_type})
                  </span>
                  <StatusChip status={approval.status} />
                  {approval.status === "pending" ? (
                    <span className="flex items-center gap-1.5">
                      <input
                        className={`${inputClass} w-44`}
                        placeholder="Rejection reason…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <Button size="sm" variant="secondary" loading={decideApproval.isPending} onClick={() => void handleDecide(approval.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50" onClick={() => void handleDecide(approval.id, "rejected")}>
                        Reject
                      </Button>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      {approval.approver_name ?? approval.approver_role} · {formatDate(approval.updated_at)}
                      {approval.comments ? ` — ${approval.comments}` : ""}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// --- Validation tab ----------------------------------------------------------

function ValidationTab({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useValidationReport(projectId);
  const groups: { key: "errors" | "warnings" | "infos"; label: string; style: string }[] = [
    { key: "errors", label: "Errors", style: "border-rose-200 bg-rose-50 text-rose-700" },
    { key: "warnings", label: "Warnings", style: "border-amber-200 bg-amber-50 text-amber-700" },
    { key: "infos", label: "Info", style: "border-slate-200 bg-slate-50 text-slate-500" },
  ];

  return (
    <Card>
      <CardHeader title="Validation warnings" description="Traceability rules (TR-xx) checked against the project data. Errors block phase completion; warnings flag drift." />
      <div className="space-y-4 px-5 py-4">
        {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
        {isLoading || !data ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : (
          groups.map((group) => {
            const items = data[group.key];
            return (
              <div key={group.key}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label} ({items.length})
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400">No {group.label.toLowerCase()}.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item.rule} className={`rounded-md border px-3 py-2 text-xs ${group.style}`}>
                        <span className="font-mono font-semibold">{item.rule}</span> — {item.message}
                        {item.violations.length > 0 ? (
                          <span className="ml-1.5 font-mono text-[10px] opacity-80">{item.violations.join(", ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// --- Traceability tab --------------------------------------------------------

function TraceabilityTab({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useTraceability(projectId);
  return (
    <Card>
      <CardHeader title="Traceability coverage" description="Per-requirement coverage (use cases, workflows, test cases, tasks) plus orphan references. TR rules TR-01/TR-07/TR-20 depend on these links." />
      <div className="space-y-4 px-5 py-4">
        {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
        {isLoading || !data ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Requirements {data.summary.total_requirements}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                Covered {data.summary.covered}
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700">
                Uncovered {data.summary.uncovered}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Links {data.summary.total_links}
              </span>
              {data.orphan_references.length > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                  Orphan references {data.orphan_references.length}
                </span>
              ) : null}
            </div>

            {data.requirements_coverage.length === 0 ? (
              <EmptyState title="No requirements" hint="Traceability coverage is computed per requirement." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3 font-semibold">Requirement</th>
                      <th className="py-2 pr-3 font-semibold">Priority</th>
                      <th className="py-2 pr-3 font-semibold">UC</th>
                      <th className="py-2 pr-3 font-semibold">WF</th>
                      <th className="py-2 pr-3 font-semibold">TC</th>
                      <th className="py-2 pr-3 font-semibold">Tasks</th>
                      <th className="py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requirements_coverage.map((req) => (
                      <tr key={req.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">
                          <span className="font-mono text-slate-500">{req.id}</span>{" "}
                          <span className="text-slate-700">{req.title}</span>
                          {req.links.total === 0 ? (
                            <span className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-rose-600">
                              uncovered
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 text-slate-500">{req.priority ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-500">{req.links.use_cases}</td>
                        <td className="py-2 pr-3 text-slate-500">{req.links.workflows}</td>
                        <td className="py-2 pr-3 text-slate-500">{req.links.test_cases}</td>
                        <td className="py-2 pr-3 text-slate-500">{req.links.tasks}</td>
                        <td className="py-2 font-semibold text-slate-700">{req.links.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.orphan_references.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Orphan references</p>
                <ul className="space-y-1">
                  {data.orphan_references.map((o) => (
                    <li key={o.id} className="font-mono text-[11px] text-slate-500">
                      {o.reference}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

// --- Audit tab ---------------------------------------------------------------

function AuditTab({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useAudit(projectId);
  return (
    <Card>
      <CardHeader title="Audit log" description="Append-only event log: creation, update, status changes, approvals, rejections, generation, export, and task state changes." />
      <div className="px-5 py-4">
        {error ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : null}
        {isLoading || !data ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No events recorded" hint="Every lifecycle transition and approval decision is appended here." />
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {data.map((event) => (
              <li key={event.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50">
                <span className="shrink-0 font-mono text-slate-400">{formatDate(event.created_at)}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                  {event.action}
                </span>
                <span className="font-mono">{event.entity_type}:{event.entity_id}</span>
                {event.from_status || event.to_status ? (
                  <span>
                    {event.from_status ?? "—"} → {event.to_status ?? "—"}
                  </span>
                ) : null}
                <span className="truncate text-slate-400">{event.actor ?? "system"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// --- Page --------------------------------------------------------------------

type TabKey = "status" | "approvals" | "validation" | "traceability" | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "status", label: "Status lifecycle" },
  { key: "approvals", label: "Approvals" },
  { key: "validation", label: "Validation" },
  { key: "traceability", label: "Traceability" },
  { key: "audit", label: "Audit log" },
];

export function GovernancePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tab, setTab] = useState<TabKey>("status");

  if (!projectId) return <ErrorState message="Missing project id" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance"
        description="Approval gates, the artifact status lifecycle, the audit trail, and traceability coverage. Automation drafts — humans approve."
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "status" ? <StatusTab projectId={projectId} /> : null}
      {tab === "approvals" ? <ApprovalsTab projectId={projectId} /> : null}
      {tab === "validation" ? <ValidationTab projectId={projectId} /> : null}
      {tab === "traceability" ? <TraceabilityTab projectId={projectId} /> : null}
      {tab === "audit" ? <AuditTab projectId={projectId} /> : null}
    </div>
  );
}
