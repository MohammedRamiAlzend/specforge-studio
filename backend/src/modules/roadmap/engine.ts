// ---------------------------------------------------------------------------
// Roadmap engine (Prompt 10).
//
// Derives a complete roadmap plan from project artifacts — the database is the
// source of truth. The derivation is deterministic: the same project state
// always produces the same phases, milestones, epics, task drafts,
// dependencies, priorities, and approval gates. Task drafts never invent
// requirements: every draft references the artifact it was derived from
// (TR-15), and its checklist is concrete, sequential, and verifiable.
// The agent task packager (backend/src/modules/agent-tasks/) materializes the
// drafts into the canonical tasks/task_checklists/task_dependencies tables.
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";

export type TaskKind = "spec" | "backend" | "frontend" | "docs" | "test" | "governance" | "ops";
export type Priority = "high" | "medium" | "low";
export type SourceType =
  | "requirement"
  | "api_endpoint"
  | "entity"
  | "screen"
  | "workflow"
  | "risk"
  | "test_case";

export interface ChecklistItem {
  description: string;
  verification: string;
}

export interface PhaseDraft {
  name: string;
  description: string;
  approvalRequired: boolean;
  gateCriteria: string;
}

export interface MilestoneDraft {
  phaseName: string;
  name: string;
  weeks: number;
  gateCriteria: string;
}

export interface EpicDraft {
  phaseName: string;
  moduleId: string | null;
  name: string;
  description: string;
}

export interface TaskDraft {
  epicName: string;
  moduleId: string | null;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  type: TaskKind;
  priority: Priority;
  objective: string;
  context: string;
  constraints: string[];
  inputArtifacts: string[];
  checklist: ChecklistItem[];
  definitionOfDone: string;
  approvalRequired: boolean;
}

export interface DependencyDraft {
  fromSourceType: SourceType;
  fromSourceId: string;
  toSourceType: SourceType;
  toSourceId: string;
  reason: string;
}

export interface RoadmapPlan {
  phases: PhaseDraft[];
  milestones: MilestoneDraft[];
  epics: EpicDraft[];
  tasks: TaskDraft[];
  dependencies: DependencyDraft[];
  inputCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Row shapes (project artifacts)
// ---------------------------------------------------------------------------

interface ModuleRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface RequirementRow {
  id: string;
  module_id: string | null;
  title: string;
  type: string | null;
  priority: string | null;
  criticality: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: string;
}

interface ApiRow {
  id: string;
  module_id: string | null;
  method: string;
  path: string;
  purpose: string | null;
}

interface EntityRow {
  id: string;
  module_id: string | null;
  name: string;
  description: string | null;
}

interface ScreenRow {
  id: string;
  module_id: string | null;
  name: string;
  description: string | null;
}

interface WorkflowRow {
  id: string;
  module_id: string | null;
  name: string;
  description: string | null;
}

interface RiskRow {
  id: string;
  title: string;
  likelihood: string;
  impact: string;
  mitigation: string | null;
  status: string;
}

interface LinkRow {
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  link_type: string;
}

// ---------------------------------------------------------------------------
// Fixed phase skeleton (deterministic)
// ---------------------------------------------------------------------------

const PHASES: PhaseDraft[] = [
  {
    name: "Definition",
    description: "Requirements, scope, use cases, and risk analysis.",
    approvalRequired: true,
    gateCriteria: "All must-have requirements are approved (APR) — TR-20 gate.",
  },
  {
    name: "Design",
    description: "Architecture, data model, and API contract design.",
    approvalRequired: true,
    gateCriteria: "Architecture, database schema, and API contracts are approved (APR).",
  },
  {
    name: "Implementation",
    description: "Backend, frontend, and integration work per module.",
    approvalRequired: false,
    gateCriteria: "All implementation task packs done; no open critical risks (TR-19).",
  },
  {
    name: "Validation",
    description: "Test execution, review, and release approval.",
    approvalRequired: true,
    gateCriteria: "Test cases pass; every critical requirement has test coverage (TR-07).",
  },
  {
    name: "Delivery",
    description: "Deployment, documentation, and handoff.",
    approvalRequired: false,
    gateCriteria: "Deployment verified, workspace regenerated, handoff recorded.",
  },
];

const MILESTONES: MilestoneDraft[] = [
  { phaseName: "Definition", name: "Definition complete", weeks: 2, gateCriteria: "Requirements approved." },
  { phaseName: "Design", name: "Design complete", weeks: 4, gateCriteria: "Architecture, schema, and API contracts approved." },
  { phaseName: "Implementation", name: "Implementation complete", weeks: 8, gateCriteria: "All implementation tasks done." },
  { phaseName: "Validation", name: "Validation complete", weeks: 10, gateCriteria: "Tests pass and release approved." },
  { phaseName: "Delivery", name: "Delivery complete", weeks: 12, gateCriteria: "Deployed and handed off." },
];

// ---------------------------------------------------------------------------
// Reading project artifacts
// ---------------------------------------------------------------------------

function listModules(db: Database, projectId: string): ModuleRow[] {
  return db
    .query("SELECT id, name, description, sort_order FROM modules WHERE project_id = ? ORDER BY sort_order, id")
    .all(projectId) as ModuleRow[];
}

function listRequirements(db: Database, projectId: string): RequirementRow[] {
  return db
    .query(
      "SELECT id, module_id, title, type, priority, criticality, description, acceptance_criteria, status FROM requirements WHERE project_id = ? ORDER BY id",
    )
    .all(projectId) as RequirementRow[];
}

function listApis(db: Database, projectId: string): ApiRow[] {
  return db
    .query("SELECT id, module_id, method, path, purpose FROM api_endpoints WHERE project_id = ? ORDER BY id")
    .all(projectId) as ApiRow[];
}

function listEntities(db: Database, projectId: string): EntityRow[] {
  return db
    .query("SELECT id, module_id, name, description FROM entities WHERE project_id = ? ORDER BY id")
    .all(projectId) as EntityRow[];
}

function listScreens(db: Database, projectId: string): ScreenRow[] {
  return db
    .query("SELECT id, module_id, name, description FROM screens WHERE project_id = ? ORDER BY id")
    .all(projectId) as ScreenRow[];
}

function listWorkflows(db: Database, projectId: string): WorkflowRow[] {
  return db
    .query("SELECT id, module_id, name, description FROM workflows WHERE project_id = ? ORDER BY id")
    .all(projectId) as WorkflowRow[];
}

function listRisks(db: Database, projectId: string): RiskRow[] {
  return db
    .query("SELECT id, title, likelihood, impact, mitigation, status FROM risks WHERE project_id = ? ORDER BY id")
    .all(projectId) as RiskRow[];
}

function listLinks(db: Database, projectId: string): LinkRow[] {
  return db
    .query("SELECT from_type, from_id, to_type, to_id, link_type FROM artifact_links WHERE project_id = ? ORDER BY id")
    .all(projectId) as LinkRow[];
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

function requirementPriority(requirement: RequirementRow): Priority {
  if (requirement.priority === "must" || requirement.criticality === "critical") return "high";
  if (requirement.priority === "could" || requirement.priority === "wont") return "low";
  return "medium";
}

function modulePriority(requirements: RequirementRow[], moduleId: string | null): Priority {
  if (!moduleId) return "medium";
  const moduleReqs = requirements.filter((r) => r.module_id === moduleId);
  const critical = moduleReqs.some((r) => r.priority === "must" || r.criticality === "critical");
  return critical ? "high" : "medium";
}

function riskPriority(risk: RiskRow): Priority {
  return risk.impact === "critical" || risk.likelihood === "high" ? "high" : "medium";
}

function riskApproval(risk: RiskRow): boolean {
  return risk.impact === "critical" || risk.likelihood === "high";
}

function reqType(requirement: RequirementRow): "functional" | "nonfunctional" | "constraint" | "other" {
  if (requirement.type === "nonfunctional") return "nonfunctional";
  if (requirement.type === "constraint") return "constraint";
  if (requirement.type === "functional") return "functional";
  return "other";
}

// ---------------------------------------------------------------------------
// Task draft builders (concrete, sequential, verifiable — agent-neutral)
// ---------------------------------------------------------------------------

function requirementTask(
  requirement: RequirementRow,
  module: ModuleRow | undefined,
  links: LinkRow[],
  apisInModule: Set<string>,
  screensInModule: Set<string>,
): TaskDraft | null {
  const kind = reqType(requirement);
  if (kind === "functional") {
    const priority = requirementPriority(requirement);
    const linkedIds = links
      .filter((l) => (l.from_id === requirement.id || l.to_id === requirement.id) && l.from_type === "requirement")
      .map((l) => (l.from_id === requirement.id ? l.to_id : l.from_id));
    const inputArtifacts = [requirement.id, ...linkedIds];
    return {
      epicName: module?.name ?? "Core Implementation",
      moduleId: requirement.module_id,
      sourceType: "requirement",
      sourceId: requirement.id,
      title: `Implement: ${requirement.title}`,
      type: module ? (apisInModule.has(module.id) ? "backend" : screensInModule.has(module.id) ? "frontend" : "spec") : "spec",
      priority,
      objective: `Satisfy ${requirement.id}: ${requirement.title}.`,
      context: `Derived from requirement ${requirement.id} (${module?.name ?? "no module"}). Description: ${requirement.description ?? "—"}`,
      constraints: [
        "Do not invent scope beyond the requirement — the SRS is the source of requirements.",
        `Reference ${requirement.id} by canonical ID in code comments and traceability (TR-20).`,
      ],
      inputArtifacts: [...new Set(inputArtifacts)],
      checklist: [
        {
          description: `Locate the implementation area for ${requirement.id}`,
          verification: "Entry point identified and recorded",
        },
        {
          description: `Implement the behavior described in ${requirement.id} (${requirement.title})`,
          verification: "Behavior present and demonstrable",
        },
        {
          description: "Address every acceptance criterion",
          verification: `Each criterion in "${requirement.acceptance_criteria ?? "acceptance criteria"}" demonstrated`,
        },
        {
          description: "Add tests covering the implemented behavior",
          verification: "Tests pass for the new behavior",
        },
        {
          description: `Link this task to ${requirement.id} in traceability`,
          verification: "artifact_links row exists (TR-20)",
        },
      ],
      definitionOfDone: `Requirement ${requirement.id} is implemented and verified against its acceptance criteria; tests pass; task is linked to ${requirement.id}.`,
      approvalRequired: false,
    };
  }
  if (kind === "constraint" || kind === "nonfunctional") {
    const isConstraint = kind === "constraint";
    return {
      epicName: "Governance & Approvals",
      moduleId: requirement.module_id,
      sourceType: "requirement",
      sourceId: requirement.id,
      title: `${isConstraint ? "Enforce" : "Guarantee"}: ${requirement.title}`,
      type: isConstraint ? "governance" : "ops",
      priority: requirement.criticality === "critical" ? "high" : "medium",
      objective: `${isConstraint ? "Enforce" : "Guarantee"} ${requirement.id}: ${requirement.title}.`,
      context: `Derived from ${isConstraint ? "constraint" : "non-functional"} requirement ${requirement.id}. ${requirement.description ?? ""}`,
      constraints: ["This is a hard constraint — implementation must not violate it."],
      inputArtifacts: [requirement.id],
      checklist: [
        {
          description: `Implement the ${isConstraint ? "constraint" : "non-functional requirement"} described in ${requirement.id}`,
          verification: "Mechanism present and active",
        },
        {
          description: "Add a guard/verification that proves the property holds",
          verification: "Automated check fails when the property is violated",
        },
        {
          description: "Document the property in the SRS section",
          verification: "SRS reflects the enforced behavior",
        },
        {
          description: "Request and record approval (APR) before completion",
          verification: "Approval row exists for this task's artifact",
        },
      ],
      definitionOfDone: `${requirement.id} is enforced, guarded by an automated check, documented, and approved (APR).`,
      approvalRequired: true,
    };
  }
  return null;
}

function apiTask(api: ApiRow, module: ModuleRow | undefined, priority: Priority): TaskDraft {
  return {
    epicName: module?.name ?? "Core Implementation",
    moduleId: api.module_id,
    sourceType: "api_endpoint",
    sourceId: api.id,
    title: `Implement ${api.method} ${api.path}`,
    type: "backend",
    priority,
    objective: `Implement ${api.method} ${api.path}: ${api.purpose ?? "documented endpoint"}.`,
    context: `Derived from API endpoint ${api.id}${module ? ` (module ${module.name})` : ""}.`,
    constraints: ["Validate inputs with Zod (400 VALIDATION_ERROR on invalid payload).", "Return the documented error codes."],
    inputArtifacts: [api.id],
    checklist: [
      { description: `Add route ${api.method} ${api.path}`, verification: "Route is registered" },
      { description: "Validate the request against the documented schema", verification: "Invalid payload returns 400 VALIDATION_ERROR" },
      { description: "Implement the response per the documented response schema", verification: "Response matches response_schema" },
      { description: "Handle every documented error code", verification: "Each error code is covered" },
      { description: "Add tests for the endpoint", verification: "Endpoint tests pass" },
    ],
    definitionOfDone: `${api.method} ${api.path} returns the documented response and errors; typecheck and tests pass.`,
    approvalRequired: false,
  };
}

function entityTask(entity: EntityRow, module: ModuleRow | undefined, priority: Priority): TaskDraft {
  return {
    epicName: module?.name ?? "Core Implementation",
    moduleId: entity.module_id,
    sourceType: "entity",
    sourceId: entity.id,
    title: `Implement data model: ${entity.name}`,
    type: "backend",
    priority,
    objective: `Create and persist the data model for ${entity.id} (${entity.name}).`,
    context: `Derived from entity ${entity.id}${module ? ` (module ${module.name})` : ""}. ${entity.description ?? ""}`,
    constraints: ["The database is the source of truth; migrations are additive-only.", "Entity must have exactly one primary key (TR-05)."],
    inputArtifacts: [entity.id],
    checklist: [
      { description: `Create the table for ${entity.name}`, verification: "Table exists via additive migration" },
      { description: "Define all fields with types and nullability", verification: "Fields match the entity spec" },
      { description: "Mark exactly one primary key and the unique fields", verification: "TR-05 holds (exactly one PK)" },
      { description: "Add indexes for lookup columns", verification: "Indexes created" },
      { description: "Add relations to related entities", verification: "Relations resolvable by FK" },
    ],
    definitionOfDone: `Entity ${entity.name} is persisted with a primary key (TR-05) and matches the ERD.`,
    approvalRequired: false,
  };
}

function screenTask(screen: ScreenRow, module: ModuleRow | undefined, priority: Priority): TaskDraft {
  return {
    epicName: module?.name ?? "Core Implementation",
    moduleId: screen.module_id,
    sourceType: "screen",
    sourceId: screen.id,
    title: `Build UI: ${screen.name}`,
    type: "frontend",
    priority,
    objective: `Build the ${screen.name} screen (${screen.id}).`,
    context: `Derived from screen ${screen.id}${module ? ` (module ${module.name})` : ""}. ${screen.description ?? ""}`,
    constraints: ["Reuse existing UI primitives; do not introduce a second design system."],
    inputArtifacts: [screen.id],
    checklist: [
      { description: `Create the route for ${screen.name}`, verification: "Route resolves" },
      { description: "Build the screen components", verification: "Components render without errors" },
      { description: "Connect data fetching to the module APIs", verification: "Data loads from the API" },
      { description: "Handle loading, empty, and error states", verification: "All three states render" },
      { description: "Verify the flow end-to-end against the use case", verification: "Use case steps pass" },
    ],
    definitionOfDone: `${screen.name} renders, connects to its APIs, and handles loading, empty, and error states.`,
    approvalRequired: false,
  };
}

function workflowTask(workflow: WorkflowRow, module: ModuleRow | undefined, priority: Priority): TaskDraft {
  return {
    epicName: module?.name ?? "Core Implementation",
    moduleId: workflow.module_id,
    sourceType: "workflow",
    sourceId: workflow.id,
    title: `Implement workflow: ${workflow.name}`,
    type: "backend",
    priority,
    objective: `Implement the ${workflow.name} workflow (${workflow.id}).`,
    context: `Derived from workflow ${workflow.id}${module ? ` (module ${module.name})` : ""}. ${workflow.description ?? ""}`,
    constraints: ["Every workflow has one start and one end (TR-02).", "Decision nodes need conditioned outgoing edges (TR-04)."],
    inputArtifacts: [workflow.id],
    checklist: [
      { description: `Model the ${workflow.name} nodes`, verification: "Nodes exist for every step" },
      { description: "Wire edges with conditions", verification: "Decision edges carry conditions (TR-04)" },
      { description: "Validate the graph (start/end, reachability)", verification: "Validation passes (TR-02/TR-03)" },
      { description: "Handle failure and alternate branches", verification: "Failure paths execute" },
      { description: "Add tests covering the main and alternate flows", verification: "Workflow tests pass" },
    ],
    definitionOfDone: `Workflow ${workflow.name} runs end-to-end with conditioned decision branches (TR-04).`,
    approvalRequired: false,
  };
}

function riskTask(risk: RiskRow): TaskDraft {
  return {
    epicName: "Governance & Approvals",
    moduleId: null,
    sourceType: "risk",
    sourceId: risk.id,
    title: `Mitigate: ${risk.title}`,
    type: "governance",
    priority: riskPriority(risk),
    objective: `Mitigate or explicitly accept risk ${risk.id} (${risk.title}).`,
    context: `Derived from risk ${risk.id} (likelihood ${risk.likelihood}, impact ${risk.impact}). Mitigation: ${risk.mitigation ?? "—"}`,
    constraints: ["Do not close a risk without recorded evidence."],
    inputArtifacts: [risk.id],
    checklist: [
      { description: `Apply the mitigation for ${risk.title}`, verification: "Mitigation implemented" },
      { description: "Verify the mitigation reduces exposure", verification: "Evidence recorded" },
      { description: "Update the risk status (mitigated/accepted)", verification: "Status change recorded in event log" },
      {
        description: "Request approval when the risk is critical or high-likelihood",
        verification: "APR recorded or explicit acceptance noted",
      },
    ],
    definitionOfDone: `Risk ${risk.id} is marked mitigated or accepted with recorded rationale (TR-19).`,
    approvalRequired: riskApproval(risk),
  };
}

function testCoverageTask(requirement: RequirementRow): TaskDraft {
  return {
    epicName: "Testing & Validation",
    moduleId: requirement.module_id,
    sourceType: "test_case",
    sourceId: requirement.id,
    title: `Add test coverage for ${requirement.id}`,
    type: "test",
    priority: "high",
    objective: `Ensure ${requirement.id} (${requirement.title}) has test coverage.`,
    context: `Derived from critical requirement ${requirement.id} (TR-07 requires at least one test case per critical requirement).`,
    constraints: ["Test cases must link to the requirement by canonical ID."],
    inputArtifacts: [requirement.id],
    checklist: [
      { description: `Review the acceptance criteria of ${requirement.id}`, verification: "Criteria understood and listed" },
      { description: "Write test case(s) covering the criteria", verification: "TC rows created" },
      { description: "Execute the test cases and record results", verification: "Result recorded (passed/failed/blocked)" },
      { description: `Link the test cases to ${requirement.id}`, verification: "Traceability link exists (TR-07)" },
    ],
    definitionOfDone: `At least one test case (TC) links to ${requirement.id} and records a result (TR-07).`,
    approvalRequired: false,
  };
}

// ---------------------------------------------------------------------------
// Main derivation
// ---------------------------------------------------------------------------

export function deriveRoadmapPlan(db: Database, projectId: string): RoadmapPlan {
  const modules = listModules(db, projectId);
  const requirements = listRequirements(db, projectId);
  const apis = listApis(db, projectId);
  const entities = listEntities(db, projectId);
  const screens = listScreens(db, projectId);
  const workflows = listWorkflows(db, projectId);
  const risks = listRisks(db, projectId);
  const links = listLinks(db, projectId);

  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const apisInModule = new Set(apis.map((a) => a.module_id).filter((id): id is string => Boolean(id)));
  const screensInModule = new Set(screens.map((s) => s.module_id).filter((id): id is string => Boolean(id)));

  // --- Epics: one per module (Implementation) + cross-cutting epics ---------
  const epics: EpicDraft[] = [];
  epics.push({
    phaseName: "Definition",
    moduleId: null,
    name: "Requirements & Scope",
    description: "Requirements analysis, use cases, and scope decisions.",
  });
  epics.push({
    phaseName: "Design",
    moduleId: null,
    name: "Architecture & Data Design",
    description: "HLD/LLD, data model, API contracts, and screen specifications.",
  });
  for (const module of modules) {
    epics.push({
      phaseName: "Implementation",
      moduleId: module.id,
      name: module.name,
      description: module.description ?? `Implementation epic for module ${module.name}.`,
    });
  }
  epics.push({
    phaseName: "Implementation",
    moduleId: null,
    name: "Core Implementation",
    description: "Implementation work not tied to a specific module.",
  });
  epics.push({
    phaseName: "Implementation",
    moduleId: null,
    name: "Governance & Approvals",
    description: "Constraint enforcement, risk mitigation, and approval gates.",
  });
  epics.push({
    phaseName: "Validation",
    moduleId: null,
    name: "Testing & Validation",
    description: "Test cases, execution, and release review.",
  });
  epics.push({
    phaseName: "Delivery",
    moduleId: null,
    name: "Deployment & Delivery",
    description: "Deployment, documentation, and handoff.",
  });

  // --- Task drafts -----------------------------------------------------------
  const tasks: TaskDraft[] = [];

  const criticalRequirements = requirements.filter((r) => r.criticality === "critical");
  for (const requirement of requirements) {
    const task = requirementTask(
      requirement,
      requirement.module_id ? moduleById.get(requirement.module_id) : undefined,
      links,
      apisInModule,
      screensInModule,
    );
    if (task) tasks.push(task);
  }
  for (const api of apis) {
    tasks.push(apiTask(api, api.module_id ? moduleById.get(api.module_id) : undefined, modulePriority(requirements, api.module_id)));
  }
  for (const entity of entities) {
    tasks.push(entityTask(entity, entity.module_id ? moduleById.get(entity.module_id) : undefined, modulePriority(requirements, entity.module_id)));
  }
  for (const screen of screens) {
    tasks.push(screenTask(screen, screen.module_id ? moduleById.get(screen.module_id) : undefined, modulePriority(requirements, screen.module_id)));
  }
  for (const workflow of workflows) {
    tasks.push(workflowTask(workflow, workflow.module_id ? moduleById.get(workflow.module_id) : undefined, modulePriority(requirements, workflow.module_id)));
  }
  for (const risk of risks) {
    if (risk.status === "open") tasks.push(riskTask(risk));
  }
  for (const requirement of criticalRequirements) {
    tasks.push(testCoverageTask(requirement));
  }

  // --- Dependencies -----------------------------------------------------------
  // 1. Traceability links: a task depends on tasks for artifacts it references.
  // 2. Module ordering: entity -> api -> screen within a module (data before
  //    application before UI); backend before frontend.
  const deps: DependencyDraft[] = [];
  const seen = new Set<string>();
  const addDep = (from: TaskDraft, to: TaskDraft, reason: string) => {
    if (from.sourceType === to.sourceType && from.sourceId === to.sourceId) return;
    const key = `${from.sourceType}:${from.sourceId}->${to.sourceType}:${to.sourceId}`;
    if (seen.has(key)) return;
    seen.add(key);
    deps.push({
      fromSourceType: from.sourceType,
      fromSourceId: from.sourceId,
      toSourceType: to.sourceType,
      toSourceId: to.sourceId,
      reason,
    });
  };

  const taskBySource = new Map<string, TaskDraft>();
  for (const task of tasks) taskBySource.set(`${task.sourceType}:${task.sourceId}`, task);

  for (const task of tasks) {
    // traceability links (both directions; the referenced artifact's task blocks this one)
    for (const link of links) {
      const from = `${link.from_type}:${link.from_id}`;
      const to = `${link.to_type}:${link.to_id}`;
      if (from === `${task.sourceType}:${task.sourceId}` && taskBySource.has(to)) {
        addDep(task, taskBySource.get(to)!, `traceability ${link.from_id} → ${link.to_id} (${link.link_type})`);
      }
      if (to === `${task.sourceType}:${task.sourceId}` && taskBySource.has(from)) {
        addDep(task, taskBySource.get(from)!, `traceability ${link.from_id} → ${link.to_id} (${link.link_type})`);
      }
    }
    // module ordering for implementation-phase tasks
    if (task.moduleId) {
      const moduleTasks = tasks.filter((t) => t.moduleId === task.moduleId);
      if (task.sourceType === "screen") {
        for (const other of moduleTasks) {
          if (other.sourceType === "api_endpoint" || other.sourceType === "entity" || other.sourceType === "workflow") {
            addDep(task, other, `UI depends on backend work in module ${task.moduleId}`);
          }
        }
      }
      if (task.sourceType === "api_endpoint") {
        for (const other of moduleTasks) {
          if (other.sourceType === "entity") addDep(task, other, `API depends on data model in module ${task.moduleId}`);
        }
      }
    }
    // requirement implementation depends on its referenced API/screen/entity tasks
    if (task.sourceType === "requirement") {
      for (const artifactId of task.inputArtifacts) {
        for (const kind of ["api_endpoint", "screen", "entity", "workflow"] as const) {
          const referenced = taskBySource.get(`${kind}:${artifactId}`);
          if (referenced) addDep(task, referenced, `requirement ${task.sourceId} depends on ${artifactId}`);
        }
      }
    }
  }

  // --- Input counts -----------------------------------------------------------
  const count = (table: string): number => {
    const row = db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE project_id = ?`).get(projectId) as { n: number };
    return row.n;
  };
  const inputCounts: Record<string, number> = {
    modules: modules.length,
    requirements: requirements.length,
    use_cases: count("use_cases"),
    workflows: workflows.length,
    entities: entities.length,
    api_endpoints: apis.length,
    screens: screens.length,
    components: count("components"),
    risks: risks.length,
    test_cases: count("test_cases"),
  };

  return { phases: PHASES, milestones: MILESTONES, epics, tasks, dependencies: deps, inputCounts };
}
