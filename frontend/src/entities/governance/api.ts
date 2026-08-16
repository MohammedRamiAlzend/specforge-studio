import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  Approval,
  AuditEvent,
  GovernanceStatus,
  StatusInfo,
  StatusRegistry,
  TraceabilityReport,
  TransitionResult,
  ValidationReport,
} from "./types";

export const governanceKeys = {
  registry: ["governance", "statuses"] as const,
  status: (type: string, id: string) => ["governance", "status", type, id] as const,
  approvals: (projectId: string, artifactId?: string) => ["approvals", projectId, artifactId ?? ""] as const,
  audit: (projectId: string) => ["audit", projectId] as const,
  validation: (projectId: string) => ["governance", "validation", projectId] as const,
  traceability: (projectId: string) => ["governance", "traceability", projectId] as const,
};

export function useGovernanceStatuses() {
  return useQuery({
    queryKey: governanceKeys.registry,
    queryFn: () => api<StatusRegistry>("/governance/statuses"),
  });
}

export function useGovernanceStatus(artifactType: string, artifactId: string) {
  return useQuery({
    queryKey: governanceKeys.status(artifactType, artifactId),
    queryFn: () => api<StatusInfo>(`/governance/status?artifact_type=${artifactType}&artifact_id=${artifactId}`),
    enabled: Boolean(artifactType && artifactId),
  });
}

export function useTransitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { artifact_type: string; artifact_id: string; to_status: GovernanceStatus; actor?: string }) =>
      api<TransitionResult>("/governance/status", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: governanceKeys.status(result.artifact_type, result.artifact_id) });
      void qc.invalidateQueries({ queryKey: governanceKeys.audit(result.project_id) });
      void qc.invalidateQueries({ queryKey: governanceKeys.validation(result.project_id) });
      void qc.invalidateQueries({ queryKey: governanceKeys.traceability(result.project_id) });
    },
  });
}

export function useApprovals(projectId: string | undefined, artifactId?: string) {
  return useQuery({
    queryKey: governanceKeys.approvals(projectId ?? "", artifactId),
    queryFn: () => api<Approval[]>(`/approvals?project=${projectId}${artifactId ? `&artifact_id=${artifactId}` : ""}`),
    enabled: Boolean(projectId),
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { project_id: string; artifact_id: string; artifact_type: string; approver_role: string; comments?: string }) =>
      api<Approval>("/approvals", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (approval) => {
      void qc.invalidateQueries({ queryKey: governanceKeys.approvals(approval.project_id) });
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected"; approver_role: string; approver_name?: string; comments?: string }) =>
      api<Approval>(`/approvals/${input.id}/decide`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (approval) => {
      void qc.invalidateQueries({ queryKey: governanceKeys.approvals(approval.project_id) });
      void qc.invalidateQueries({ queryKey: governanceKeys.audit(approval.project_id) });
    },
  });
}

export function useAudit(projectId: string | undefined) {
  return useQuery({
    queryKey: governanceKeys.audit(projectId ?? ""),
    queryFn: () => api<AuditEvent[]>(`/audit?project=${projectId}&limit=100`),
    enabled: Boolean(projectId),
  });
}

export function useValidationReport(projectId: string | undefined) {
  return useQuery({
    queryKey: governanceKeys.validation(projectId ?? ""),
    queryFn: () => api<ValidationReport>(`/governance/validation?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useTraceability(projectId: string | undefined) {
  return useQuery({
    queryKey: governanceKeys.traceability(projectId ?? ""),
    queryFn: () => api<TraceabilityReport>(`/governance/traceability?project=${projectId}`),
    enabled: Boolean(projectId),
  });
}
