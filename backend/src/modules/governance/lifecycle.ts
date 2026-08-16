// ---------------------------------------------------------------------------
// Governance lifecycle (Prompt 11).
//
// The canonical governance statuses and transition rules, the artifact
// registry (type -> table + domain status translation), and the approval
// gates. Governance statuses: draft, auto_generated, needs_review, approved,
// ready_for_agent, in_progress, needs_verification, done, rejected.
//
// Transitions into `approved` are gated for final requirements, final
// architecture, final data model, final API contracts, security-sensitive
// workflows, production-related decisions, and roadmaps: an approved Approval
// (APR) must exist for the artifact. Automatic generation (draft ->
// auto_generated) never requires approval — it covers draft docs, diagram
// previews, roadmap suggestions, task drafts, and traceability reports.
// ---------------------------------------------------------------------------

export const GOVERNANCE_STATUSES = [
  "draft",
  "auto_generated",
  "needs_review",
  "approved",
  "ready_for_agent",
  "in_progress",
  "needs_verification",
  "done",
  "rejected",
] as const;

export type GovernanceStatus = (typeof GOVERNANCE_STATUSES)[number];

/** Allowed transitions per current status (canonical lifecycle graph). */
export const TRANSITIONS: Record<GovernanceStatus, GovernanceStatus[]> = {
  draft: ["auto_generated", "needs_review", "rejected"],
  auto_generated: ["needs_review", "approved", "rejected"],
  needs_review: ["approved", "rejected"],
  approved: ["ready_for_agent", "in_progress", "rejected"],
  ready_for_agent: ["in_progress", "rejected"],
  in_progress: ["needs_verification", "done", "rejected"],
  needs_verification: ["done", "rejected"],
  done: ["needs_verification", "rejected"],
  rejected: ["draft", "needs_review", "in_progress"],
};

/** Artifact types supported by the governance service. */
export const ARTIFACT_TYPES = [
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
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}

/**
 * Approval gates (DEC-003): which artifact kinds need an approved APR before
 * their governance status may become `approved`.
 */
export const APPROVAL_GATED: Record<ArtifactType, boolean> = {
  module: false,
  requirement: true, // final requirements
  use_case: false,
  workflow: true, // security-sensitive workflows
  screen: false,
  entity: true, // final data model
  component: true, // final architecture
  api_endpoint: true, // final API contracts
  test_case: false,
  risk: false,
  decision: true, // production-related decisions
  milestone: false,
  task: false,
  model_graph: false,
  generated_diagram: false,
  docs_export: false,
  roadmap: true, // plan approval
};

/**
 * Artifact registry: table + per-type translation from a governance status
 * to the artifact's domain status column (best-effort sync). All tables use a
 * `status` column and are project-scoped.
 */
export interface ArtifactDef {
  table: string;
  toDomain: Record<GovernanceStatus, string>;
}

export const ARTIFACTS: Record<ArtifactType, ArtifactDef> = {
  module: {
    table: "modules",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "draft",
      approved: "active",
      ready_for_agent: "active",
      in_progress: "active",
      needs_verification: "active",
      done: "active",
      rejected: "archived",
    },
  },
  requirement: {
    table: "requirements",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "implemented",
      needs_verification: "verified",
      done: "verified",
      rejected: "rejected",
    },
  },
  use_case: {
    table: "use_cases",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "implemented",
      needs_verification: "verified",
      done: "verified",
      rejected: "archived",
    },
  },
  workflow: {
    table: "workflows",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "reviewed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "reviewed",
      needs_verification: "reviewed",
      done: "approved",
      rejected: "archived",
    },
  },
  screen: {
    table: "screens",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "implemented",
      needs_verification: "implemented",
      done: "implemented",
      rejected: "archived",
    },
  },
  entity: {
    table: "entities",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "reviewed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "implemented",
      needs_verification: "implemented",
      done: "implemented",
      rejected: "archived",
    },
  },
  component: {
    table: "components",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "reviewed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "reviewed",
      needs_verification: "reviewed",
      done: "approved",
      rejected: "archived",
    },
  },
  api_endpoint: {
    table: "api_endpoints",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "implemented",
      needs_verification: "implemented",
      done: "implemented",
      rejected: "archived",
    },
  },
  test_case: {
    table: "test_cases",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "approved",
      needs_verification: "approved",
      done: "passed",
      rejected: "failed",
    },
  },
  risk: {
    table: "risks",
    toDomain: {
      draft: "open",
      auto_generated: "open",
      needs_review: "open",
      approved: "accepted",
      ready_for_agent: "open",
      in_progress: "open",
      needs_verification: "open",
      done: "closed",
      rejected: "open",
    },
  },
  decision: {
    table: "decisions",
    toDomain: {
      draft: "proposed",
      auto_generated: "proposed",
      needs_review: "proposed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "proposed",
      needs_verification: "proposed",
      done: "approved",
      rejected: "rejected",
    },
  },
  milestone: {
    table: "milestones",
    toDomain: {
      draft: "planned",
      auto_generated: "planned",
      needs_review: "planned",
      approved: "reached",
      ready_for_agent: "planned",
      in_progress: "in_progress",
      needs_verification: "in_progress",
      done: "reached",
      rejected: "cancelled",
    },
  },
  task: {
    table: "tasks",
    toDomain: {
      draft: "open",
      auto_generated: "open",
      needs_review: "open",
      approved: "open",
      ready_for_agent: "open",
      in_progress: "in_progress",
      needs_verification: "blocked",
      done: "done",
      rejected: "cancelled",
    },
  },
  model_graph: {
    table: "model_graphs",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "reviewed",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "reviewed",
      needs_verification: "reviewed",
      done: "approved",
      rejected: "archived",
    },
  },
  generated_diagram: {
    table: "generated_diagrams",
    toDomain: {
      draft: "generated",
      auto_generated: "generated",
      needs_review: "generated",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "approved",
      needs_verification: "approved",
      done: "approved",
      rejected: "archived",
    },
  },
  docs_export: {
    table: "docs_exports",
    toDomain: {
      draft: "generated",
      auto_generated: "generated",
      needs_review: "generated",
      approved: "generated",
      ready_for_agent: "generated",
      in_progress: "generated",
      needs_verification: "generated",
      done: "generated",
      rejected: "archived",
    },
  },
  roadmap: {
    table: "roadmaps",
    toDomain: {
      draft: "draft",
      auto_generated: "draft",
      needs_review: "draft",
      approved: "approved",
      ready_for_agent: "approved",
      in_progress: "draft",
      needs_verification: "draft",
      done: "approved",
      rejected: "archived",
    },
  },
};

/** Seeds a governance status from a domain status (used when no overlay row exists yet). */
export function seedStatusFromDomain(domainStatus: string | null | undefined): GovernanceStatus {
  const status = (domainStatus ?? "draft").toLowerCase();
  if (["approved"].includes(status)) return "approved";
  if (["rejected", "failed", "cancelled"].includes(status)) return "rejected";
  if (["done", "verified", "passed", "implemented", "reached", "closed"].includes(status)) return "done";
  if (["in_progress", "active"].includes(status)) return "in_progress";
  if (["reviewed"].includes(status)) return "needs_review";
  return "draft";
}
