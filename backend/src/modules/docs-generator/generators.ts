// ---------------------------------------------------------------------------
// Document generators. Every function renders one English Markdown document
// from database rows (the database is the source of truth). Output always
// carries YAML frontmatter with stable IDs (WS-003), traceability IDs, and
// Mermaid blocks where relevant. No manual Mermaid is ever required.
// ---------------------------------------------------------------------------

import type { Database } from "bun:sqlite";
import {
  codeBlock,
  divider,
  frontmatter,
  h,
  mermaidBlock,
  ol,
  p,
  table,
  todayIso,
  ul,
} from "./markdown";
import {
  generateWorkflow,
  generateSequence,
  generateArchitectureFromComponents,
  generateErd,
  resolveCrossProjectCalls,
  type DiagramEdge,
  type DiagramNode,
} from "../diagrams/generator";
import { erdFromTables } from "../diagrams/routes";
import { listProjectDependencies, listProjectDependents, workflowCallsForProject } from "../links/routes";
import { listSkills } from "../skills";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  repository_url: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ModuleRow {
  id: string;
  name: string;
  description: string | null;
  owner_role: string | null;
  sort_order: number;
  status: string;
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

interface UseCaseRow {
  id: string;
  module_id: string | null;
  title: string;
  actor: string;
  preconditions: string | null;
  postconditions: string | null;
  main_flow: string | null;
  alternate_flows: string | null;
  status: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface EntityRow {
  id: string;
  module_id: string | null;
  name: string;
  table_name: string | null;
  description: string | null;
  status: string;
}

interface EntityFieldRow {
  entity_id: string;
  name: string;
  data_type: string;
  nullable: number;
  is_primary_key: number;
  is_unique: number;
}

interface EntityRelationRow {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
  description: string | null;
}

interface ApiEndpointRow {
  id: string;
  method: string;
  path: string;
  purpose: string | null;
  auth: string | null;
  request_schema: string | null;
  response_schema: string | null;
  error_codes: string | null;
  status: string;
}

interface ScreenRow {
  id: string;
  name: string;
  route: string | null;
  description: string | null;
  status: string;
}

interface TestCaseRow {
  id: string;
  title: string;
  test_type: string | null;
  precondition: string | null;
  steps: string | null;
  expected_results: string | null;
  result: string | null;
  status: string;
}

interface RiskRow {
  id: string;
  title: string;
  likelihood: string;
  impact: string;
  mitigation: string | null;
  owner: string | null;
  status: string;
}

interface DecisionRow {
  id: string;
  title: string;
  decision: string;
  context: string | null;
  alternatives: string | null;
  consequences: string | null;
  status: string;
}

interface ApprovalRow {
  id: string;
  artifact_id: string;
  artifact_type: string;
  approver_role: string;
  approver_name: string | null;
  decision: string | null;
  status: string;
  comments: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  milestone_id: string | null;
  title: string;
  type: string | null;
  priority: string;
  objective: string;
  context: string | null;
  constraints: string | null;
  input_artifacts: string | null;
  approval_required: number;
  status: string;
  definition_of_done: string;
}

interface ChecklistRow {
  task_id: string;
  position: number;
  description: string;
  verification_hint: string | null;
  status: string;
}

interface MilestoneRow {
  id: string;
  name: string;
  due_date: string | null;
  description: string | null;
  gate_criteria: string | null;
  status: string;
}

interface ComponentRow {
  id: string;
  name: string;
  layer: string | null;
  responsibility: string | null;
  technologies: string | null;
  status: string;
}

interface LinkRow {
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  link_type: string;
}

interface GraphRow {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  status: string;
}

interface GraphNodeRow {
  id: string;
  node_type: string;
  title: string;
  position: string;
  metadata: string | null;
}

interface GraphEdgeRow {
  id: string;
  from_node: string;
  to_node: string;
  label: string | null;
  condition: string | null;
  edge_type: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function statusBadge(status: string | null | undefined): string {
  return status ? `\`${status}\`` : "—";
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export interface GeneratorContext {
  db: Database;
  projectId: string;
  artifactId: string;
  exportDate: string;
}

function getProject(db: Database, projectId: string): ProjectRow {
  return db.query("SELECT * FROM projects WHERE id = ?").get(projectId) as ProjectRow;
}

function listModules(db: Database, projectId: string): ModuleRow[] {
  return db
    .query("SELECT * FROM modules WHERE project_id = ? ORDER BY sort_order, id")
    .all(projectId) as ModuleRow[];
}

function listRequirements(db: Database, projectId: string): RequirementRow[] {
  return db
    .query("SELECT id, module_id, title, type, priority, criticality, description, acceptance_criteria, status FROM requirements WHERE project_id = ? ORDER BY id")
    .all(projectId) as RequirementRow[];
}

function listUseCases(db: Database, projectId: string): UseCaseRow[] {
  return db
    .query("SELECT id, module_id, title, actor, preconditions, postconditions, main_flow, alternate_flows, status FROM use_cases WHERE project_id = ? ORDER BY id")
    .all(projectId) as UseCaseRow[];
}

function listWorkflows(db: Database, projectId: string): WorkflowRow[] {
  return db
    .query("SELECT id, name, description, status FROM workflows WHERE project_id = ? ORDER BY id")
    .all(projectId) as WorkflowRow[];
}

function listEntities(db: Database, projectId: string): EntityRow[] {
  return db
    .query("SELECT id, module_id, name, table_name, description, status FROM entities WHERE project_id = ? ORDER BY id")
    .all(projectId) as EntityRow[];
}

function listEntityFields(db: Database): EntityFieldRow[] {
  return db
    .query("SELECT entity_id, name, data_type, nullable, is_primary_key, is_unique FROM entity_fields ORDER BY entity_id, id")
    .all() as EntityFieldRow[];
}

function listEntityRelations(db: Database, projectId: string): EntityRelationRow[] {
  return db
    .query("SELECT id, from_entity_id, to_entity_id, relation_type, description FROM entity_relations WHERE project_id = ? ORDER BY id")
    .all(projectId) as EntityRelationRow[];
}

function listApiEndpoints(db: Database, projectId: string): ApiEndpointRow[] {
  return db
    .query("SELECT id, method, path, purpose, auth, request_schema, response_schema, error_codes, status FROM api_endpoints WHERE project_id = ? ORDER BY id")
    .all(projectId) as ApiEndpointRow[];
}

function listScreens(db: Database, projectId: string): ScreenRow[] {
  return db
    .query("SELECT id, name, route, description, status FROM screens WHERE project_id = ? ORDER BY id")
    .all(projectId) as ScreenRow[];
}

function listTestCases(db: Database, projectId: string): TestCaseRow[] {
  return db
    .query("SELECT id, title, test_type, precondition, steps, expected_results, result, status FROM test_cases WHERE project_id = ? ORDER BY id")
    .all(projectId) as TestCaseRow[];
}

function listRisks(db: Database, projectId: string): RiskRow[] {
  return db
    .query("SELECT id, title, likelihood, impact, mitigation, owner, status FROM risks WHERE project_id = ? ORDER BY id")
    .all(projectId) as RiskRow[];
}

function listDecisions(db: Database, projectId: string): DecisionRow[] {
  return db
    .query("SELECT id, title, decision, context, alternatives, consequences, status FROM decisions WHERE project_id = ? ORDER BY id")
    .all(projectId) as DecisionRow[];
}

function listApprovals(db: Database, projectId: string): ApprovalRow[] {
  return db
    .query("SELECT id, artifact_id, artifact_type, approver_role, approver_name, decision, status, comments, created_at FROM approvals WHERE project_id = ? ORDER BY id")
    .all(projectId) as ApprovalRow[];
}

function listTasks(db: Database, projectId: string): TaskRow[] {
  return db
    .query("SELECT id, milestone_id, title, type, priority, objective, context, constraints, input_artifacts, approval_required, status, definition_of_done FROM tasks WHERE project_id = ? ORDER BY id")
    .all(projectId) as TaskRow[];
}

function listChecklists(db: Database): ChecklistRow[] {
  return db
    .query("SELECT task_id, position, description, verification_hint, status FROM task_checklists ORDER BY task_id, position")
    .all() as ChecklistRow[];
}

function listMilestones(db: Database, projectId: string): MilestoneRow[] {
  return db
    .query("SELECT id, name, due_date, description, gate_criteria, status FROM milestones WHERE project_id = ? ORDER BY id")
    .all(projectId) as MilestoneRow[];
}

function listComponents(db: Database, projectId: string): ComponentRow[] {
  return db
    .query("SELECT id, name, layer, responsibility, technologies, status FROM components WHERE project_id = ? ORDER BY id")
    .all(projectId) as ComponentRow[];
}

function listLinks(db: Database, projectId: string): LinkRow[] {
  return db
    .query("SELECT from_type, from_id, to_type, to_id, link_type FROM artifact_links WHERE project_id = ? ORDER BY from_type, from_id, to_type, to_id")
    .all(projectId) as LinkRow[];
}

function listGraphs(db: Database, projectId: string, kind: string): GraphRow[] {
  return db
    .query("SELECT id, kind, name, description, status FROM model_graphs WHERE project_id = ? AND kind = ? ORDER BY id")
    .all(projectId, kind) as GraphRow[];
}

function graphNodes(db: Database, graphId: string): GraphNodeRow[] {
  return db
    .query("SELECT id, node_type, title, position, metadata FROM model_nodes WHERE graph_id = ? ORDER BY id")
    .all(graphId) as GraphNodeRow[];
}

function graphEdges(db: Database, graphId: string): GraphEdgeRow[] {
  return db
    .query("SELECT id, from_node, to_node, label, condition, edge_type FROM model_edges WHERE graph_id = ? ORDER BY id")
    .all(graphId) as GraphEdgeRow[];
}

function toDiagramNodes(rows: GraphNodeRow[]): DiagramNode[] {
  return rows.map((row) => ({
    id: row.id,
    key: row.id,
    type: row.node_type,
    title: row.title,
    position: parseJson<{ x: number; y: number }>(row.position) ?? { x: 0, y: 0 },
    metadata: parseJson<Record<string, unknown>>(row.metadata),
  }));
}

function toDiagramEdges(rows: GraphEdgeRow[]): DiagramEdge[] {
  return rows.map((row) => ({
    id: row.id,
    source: row.from_node,
    target: row.to_node,
    label: row.label,
    condition: row.condition,
    type: row.edge_type,
  }));
}

function frontmatterFor(ctx: GeneratorContext, title: string, type: string, extra: Record<string, unknown> = {}) {
  return frontmatter({
    id: ctx.artifactId,
    title,
    type,
    status: "generated",
    project: ctx.projectId,
    updated: ctx.exportDate,
    ...extra,
  });
}

function section(title: string, body: string): string {
  return h(2, title) + body;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function genReadme(ctx: GeneratorContext): string {
  const project = getProject(ctx.db, ctx.projectId);
  const requirements = listRequirements(ctx.db, ctx.projectId);
  const tasks = listTasks(ctx.db, ctx.projectId);
  const risks = listRisks(ctx.db, ctx.projectId);

  const body =
    p(`# ${project.name}`) +
    p(project.description ?? "Internal software engineering lifecycle platform.") +
    divider() +
    section("About", p(`- Project ID: \`${project.id}\`\n- Type: \`${project.type}\`\n- Status: \`${project.status}\`\n- Repository: ${project.repository_url ?? "—"}\n- Created by: ${project.created_by}\n- Created: ${dateOnly(project.created_at)}`)) +
    section("Contents", ul([
      "00-meta — project profile, ID registry, glossary",
      "01-planning — charter, vision, scope, risks, milestones",
      "02-requirements — SRS, use cases, traceability",
      "03-design — HLD, LLD, workflows, ERD, API, sequences",
      "04-ui — screen specifications",
      "05-testing — test plan, test cases, templates",
      "06-ops — deployment guide",
      "07-guides — developer and user guides, skills",
      "08-governance — ADRs, approvals",
      "09-agent-plans — master plan, tasks, checklists, agent guide",
    ])) +
    section("Reading Order", ol([
      "00-meta/project.md",
      "01-planning/project-charter.md",
      "01-planning/vision.md",
      "02-requirements/srs.md",
      "03-design/hld.md",
      "03-design/lld.md",
      "03-design/workflows.md",
      "09-agent-plans/master-plan.md",
    ])) +
    section("Health Snapshot", p(table(
      ["Artifact", "Count"],
      [
        ["Requirements", requirements.length],
        ["Tasks", tasks.length],
        ["Open risks", risks.filter((r) => r.status === "open").length],
      ],
    ))) +
    section("Regeneration", p("This workspace is generated from the database. Regenerating creates a new export and supersedes this one; files marked with `<!-- protected -->` keep manual edits. See 09-agent-plans/agent-guide.md."));

  return frontmatterFor(ctx, "Project Workspace", "index") + body;
}

export function genAgents(ctx: GeneratorContext): string {
  const body =
    p("# AGENTS.md — Workspace Agent Guide") +
    section("Purpose", p("This workspace is the portable, machine-readable specification of the project. Agents (Claude, ChatGPT, Qwen, or compatible) can execute task packs and verify definitions of done without any other context.")) +
    section("Reading Order", ol([
      "README.md — overview and health snapshot",
      "00-meta/project.md — project profile",
      "02-requirements/srs.md — the requirements (traceability root)",
      "03-design/hld.md + lld.md — architecture and data model",
      "09-agent-plans/master-plan.md — plan and phases",
      "09-agent-plans/tasks.md — executable task packs",
    ])) +
    section("Rules for Agents", ul([
      "Treat the database as the source of truth; Markdown here is generated output.",
      "Never edit files that do not carry the `<!-- protected -->` marker — edits are lost on regeneration.",
      "Reference artifacts by canonical ID (REQ-0001, TASK-0012), never by title.",
      "Complete task checklists in order and verify each item before marking it done.",
      "Record verification results back in the task pack before moving on.",
      "Do not start optional work without approval.",
    ])) +
    section("Protected Sections", p("A file is preserved across regenerations when its content contains `<!-- protected -->` or frontmatter `protected: true`. Use it for manually maintained sections."));

  return frontmatterFor(ctx, "Workspace Agent Guide", "guide", { related: ["AGENTS.md"] }) + body;
}

export function genProjectMeta(ctx: GeneratorContext): string {
  const project = getProject(ctx.db, ctx.projectId);
  const modules = listModules(ctx.db, ctx.projectId);
  const platform = projectTypeSelection(ctx.db, ctx.projectId);
  const identity = table(
    ["Field", "Value"],
    [
      ["ID", project.id],
      ["Name", project.name],
      ["Type", project.type],
      ["Status", project.status],
      ["Repository", project.repository_url ?? "—"],
      ["Created by", project.created_by],
      ["Created", dateOnly(project.created_at)],
      ["Updated", dateOnly(project.updated_at)],
    ],
  );
  const typeRows = platform.map((t) => [
    t.type_id,
    t.label,
    `\`${t.key}\``,
    t.stack_name ?? "—",
    t.libraries.length === 0 ? "—" : t.libraries.map((l) => l.name).join(", "),
  ]);
  const body =
    p("# Project Profile") +
    section("Identity", p(identity)) +
    section("Description", p(project.description ?? "No description provided.")) +
    section(
      "Platform Configuration",
      platform.length === 0
        ? p("No platform types assigned yet.")
        : table(["Type ID", "Type", "Key", "Stack", "Libraries"], typeRows),
    ) +
    section("Modules", modules.length === 0
      ? p("No modules defined yet.")
      : table(["ID", "Module", "Owner", "Status"], modules.map((m) => [m.id, m.name, m.owner_role ?? "—", statusBadge(m.status)])));

  return frontmatterFor(ctx, "Project Profile", "project") + body;
}

interface ProjectTypeSelectionRow {
  type_id: string;
  label: string;
  key: string;
  stack_id: string | null;
  stack_name: string | null;
}

/** Loads a project's platform type selection (types + chosen stack + libraries). */
export function projectTypeSelection(db: Database, projectId: string): (ProjectTypeSelectionRow & {
  libraries: { id: string; name: string }[];
})[] {
  const rows = db
    .query(
      `SELECT pt.id AS type_id, pt.label, pt.key, ptc.stack_id AS stack_id, st.name AS stack_name
       FROM project_type_assignments pta
       JOIN project_types pt ON pt.id = pta.type_id
       LEFT JOIN project_type_config ptc ON ptc.project_id = pta.project_id AND ptc.type_id = pta.type_id
       LEFT JOIN stacks st ON st.id = ptc.stack_id
       WHERE pta.project_id = ?
       ORDER BY pt.sort_order, pt.id`,
    )
    .all(projectId) as (ProjectTypeSelectionRow & { stack_id: string | null; stack_name: string | null })[];
  const libraryQuery = db.query(
    `SELECT lib.id, lib.name
     FROM project_libraries pl
     JOIN libraries lib ON lib.id = pl.library_id
     WHERE pl.project_id = ? AND pl.type_id = ?
     ORDER BY lib.name`,
  );
  return rows.map((row) => ({
    ...row,
    libraries: libraryQuery.all(projectId, row.type_id) as { id: string; name: string }[],
  }));
}

export function genIdRegistry(ctx: GeneratorContext): string {
  const rows = ctx.db
    .query("SELECT prefix, next_value FROM id_sequences WHERE project_id = ? OR project_id IS NULL ORDER BY prefix")
    .all(ctx.projectId) as { prefix: string; next_value: number }[];
  const body =
    p("# ID Registry") +
    section("Purpose", p("Stable, immutable public IDs are the traceability backbone (docs/ontology/id-convention.md). This registry lists allocation counters per prefix.")) +
    section("Counters", rows.length === 0
      ? p("No IDs allocated yet.")
      : table(["Prefix", "Next value"], rows.map((r) => [r.prefix, r.next_value]))) +
    section("Rules", ul([
      "IDs are never reused.",
      "Cross-references always use canonical IDs.",
      "Child IDs follow `<PARENT>-<CODE><NN>` (e.g. GRPH-0001-N01).",
    ]));

  return frontmatterFor(ctx, "ID Registry", "index") + body;
}

export function genGlossary(ctx: GeneratorContext): string {
  const terms: [string, string][] = [
    ["Artifact", "Any traceable entity with a stable ID (requirement, workflow, task, diagram, ...)."],
    ["Approval gate", "A recorded human decision (APR) required before an artifact reaches approved status."],
    ["Definition of done", "Verifiable completion criteria for a task."],
    ["Model graph", "A structured canvas model (GRPH) backing workflow, data, architecture, or sequence diagrams."],
    ["Task pack", "An executable, agent-neutral set of tasks with checklists (TASK + CHK)."],
    ["Traceability", "The ability to follow an artifact to its sources and consumers via artifact_links."],
    ["Workspace export", "A regenerable English Markdown snapshot of the project (DOCS)."],
  ];
  const body =
    p("# Glossary") +
    section("Terms", table(["Term", "Definition"], terms.map(([term, definition]) => [term, definition])));

  return frontmatterFor(ctx, "Glossary", "index") + body;
}

export function genCharter(ctx: GeneratorContext): string {
  const project = getProject(ctx.db, ctx.projectId);
  const milestones = listMilestones(ctx.db, ctx.projectId);
  const body =
    p("# Project Charter") +
    section("Mission", p(project.description ?? "No description provided.")) +
    section("Objectives", ul([
      "Deliver a working product per the approved requirements (02-requirements/srs.md).",
      "Maintain full traceability from requirements to tasks and tests.",
      "Keep the database as the single source of truth.",
    ])) +
    section("Scope", p("In scope: the modules and requirements listed in 02-requirements/srs.md. Out of scope decisions are recorded in 01-planning/scope.md and ADRs (08-governance/adrs.md).")) +
    section("Milestones", milestones.length === 0
      ? p("No milestones defined yet.")
      : table(["ID", "Milestone", "Due", "Status"], milestones.map((m) => [m.id, m.name, m.due_date ?? "—", statusBadge(m.status)]))) +
    section("Stakeholders", p(`Owner: ${project.created_by}. Roles are described in 07-guides/user-guide.md.`));

  return frontmatterFor(ctx, "Project Charter", "plan") + body;
}

export function genVision(ctx: GeneratorContext): string {
  const project = getProject(ctx.db, ctx.projectId);
  const modules = listModules(ctx.db, ctx.projectId);
  const body =
    p("# Vision") +
    section("Vision Statement", p(`${project.name} converts visual planning and structured specifications into engineering documentation, diagrams, roadmaps, and executable task packs — with full traceability and governed approval gates.`)) +
    section("Why", ul([
      "Specifications drift from implementation without traceability.",
      "Agents need portable, executable task packs instead of prose.",
      "Diagrams and docs must be generated, not hand-maintained.",
    ])) +
    section("Modules", modules.length === 0
      ? p("No modules defined yet.")
      : ul(modules.map((m) => `${m.id} — ${m.name}`)));

  return frontmatterFor(ctx, "Vision", "plan") + body;
}

export function genScope(ctx: GeneratorContext): string {
  const requirements = listRequirements(ctx.db, ctx.projectId);
  const body =
    p("# Scope") +
    section("In Scope", requirements.length === 0
      ? p("No requirements defined yet.")
      : ul(requirements.map((r) => `${r.id} — ${r.title} (\`${r.priority ?? "unset"}\`)`))) +
    section("Out of Scope", ul([
      "External SaaS integrations unless explicitly approved.",
      "Manual Mermaid authoring by end users.",
      "Non-English generated documentation.",
    ])) +
    section("Non-Functional Constraints", ul([
      "Frontend: React with Feature-Sliced Design.",
      "Backend: Node.js with SQLite.",
      "Output: English Markdown with stable IDs and YAML frontmatter.",
    ]));

  return frontmatterFor(ctx, "Scope", "plan") + body;
}

export function genRiskRegister(ctx: GeneratorContext): string {
  const risks = listRisks(ctx.db, ctx.projectId);
  const body =
    p("# Risk Register") +
    section("Risks", risks.length === 0
      ? p("No risks recorded yet.")
      : table(
          ["ID", "Risk", "Likelihood", "Impact", "Mitigation", "Owner", "Status"],
          risks.map((r) => [r.id, r.title, r.likelihood, r.impact, r.mitigation ?? "—", r.owner ?? "—", statusBadge(r.status)]),
        )) +
    section("Scoring", p("Likelihood: low/medium/high. Impact: low/medium/high/critical. Status: open/mitigated/accepted/closed."));

  return frontmatterFor(ctx, "Risk Register", "index") + body;
}

export function genMilestones(ctx: GeneratorContext): string {
  const milestones = listMilestones(ctx.db, ctx.projectId);
  const body =
    p("# Milestones") +
    section("Milestones", milestones.length === 0
      ? p("No milestones defined yet.")
      : table(
          ["ID", "Milestone", "Due", "Gate criteria", "Status"],
          milestones.map((m) => [m.id, m.name, m.due_date ?? "—", m.gate_criteria ?? "—", statusBadge(m.status)]),
        ));

  return frontmatterFor(ctx, "Milestones", "index") + body;
}

export function genSrs(ctx: GeneratorContext): string {
  const requirements = listRequirements(ctx.db, ctx.projectId);
  const body =
    p("# Software Requirements Specification (SRS)") +
    section("Purpose", p("This document is the traceability root for the project. Every requirement links to use cases, workflows, tests, and tasks.")) +
    section("Requirements", requirements.length === 0
      ? p("No requirements defined yet.")
      : requirements.map((req) =>
          h(3, `${req.id} — ${req.title}`) +
          p(`- Type: ${req.type ?? "unset"} · Priority: ${req.priority ?? "unset"} · Criticality: ${req.criticality} · Status: ${statusBadge(req.status)}`) +
          p(`Description: ${req.description ?? "—"}`) +
          p(`Acceptance criteria: ${req.acceptance_criteria ?? "—"}`),
        ).join("\n")) +
    section("Traceability", p("Requirement links to use cases, workflows, tests, and tasks are listed in 02-requirements/traceability.md."));

  return frontmatterFor(ctx, "Software Requirements Specification", "index") + body;
}

export function genUseCases(ctx: GeneratorContext): string {
  const useCases = listUseCases(ctx.db, ctx.projectId);
  const body =
    p("# Use Cases") +
    section("Use Cases", useCases.length === 0
      ? p("No use cases defined yet.")
      : useCases.map((uc) =>
          h(3, `${uc.id} — ${uc.title}`) +
          p(`- Actor: ${uc.actor} · Status: ${statusBadge(uc.status)}`) +
          p("Preconditions:") + ul(parseJsonArray<string>(uc.preconditions)) +
          p("Main flow:") + ol(parseJsonArray<string>(uc.main_flow)) +
          p("Alternate flows:") + ul(parseJsonArray<string>(uc.alternate_flows)) +
          p("Postconditions:") + ul(parseJsonArray<string>(uc.postconditions)),
        ).join("\n"));

  return frontmatterFor(ctx, "Use Cases", "index") + body;
}

export function genTraceability(ctx: GeneratorContext): string {
  const links = listLinks(ctx.db, ctx.projectId);
  const requirements = listRequirements(ctx.db, ctx.projectId);
  const body =
    p("# Traceability") +
    section("Rules", ul([
      "Every requirement should link to at least one use case, workflow, or task (TR rules).",
      "Links are stored in artifact_links with a link type (satisfies, verifies, realizes, ...).",
      "References always use canonical IDs.",
    ])) +
    section("Requirements Coverage", p(table(
      ["Requirement", "Direct links"],
      requirements.map((r) => [r.id, links.filter((l) => l.from_id === r.id || l.to_id === r.id).length]),
    ))) +
    section("Links", links.length === 0
      ? p("No traceability links recorded yet.")
      : table(
          ["From", "To", "Type"],
          links.map((l) => [`${l.from_id} (${l.from_type})`, `${l.to_id} (${l.to_type})`, l.link_type]),
        ));

  return frontmatterFor(ctx, "Traceability Report", "index") + body;
}

export function genHld(ctx: GeneratorContext): string {
  const components = listComponents(ctx.db, ctx.projectId);
  const arch = generateArchitectureFromComponents(
    components.map((c) => ({
      id: c.id,
      name: c.name,
      layer: c.layer,
      technologies: parseJsonArray<string>(c.technologies),
    })),
  );
  const body =
    p("# High-Level Design (HLD)") +
    section("Architecture Overview", components.length === 0
      ? p("No components defined yet — model the architecture in the Visual Modeler or the components registry.")
      : mermaidBlock(arch.mermaid)) +
    section("Components", components.length === 0
      ? p("No components defined yet.")
      : table(
          ["ID", "Component", "Layer", "Responsibility", "Status"],
          components.map((c) => [c.id, c.name, c.layer ?? "—", c.responsibility ?? "—", statusBadge(c.status)]),
        )) +
    section("Design Principles", ul([
      "Database is the source of truth.",
      "Generated output is always English Markdown.",
      "Traceability and stable IDs everywhere.",
    ]));

  return frontmatterFor(ctx, "High-Level Design", "plan") + body;
}

export function genLld(ctx: GeneratorContext): string {
  const modules = listModules(ctx.db, ctx.projectId);
  const entities = listEntities(ctx.db, ctx.projectId);
  const fields = listEntityFields(ctx.db);
  const relations = listEntityRelations(ctx.db, ctx.projectId);

  const fieldsByEntity = new Map<string, EntityFieldRow[]>();
  for (const field of fields) {
    fieldsByEntity.set(field.entity_id, [...(fieldsByEntity.get(field.entity_id) ?? []), field]);
  }

  const entitySections = entities.map((entity) =>
    h(3, `${entity.id} — ${entity.name}`) +
    p(`Table: \`${entity.table_name ?? "—"}\` · Status: ${statusBadge(entity.status)}`) +
    p(entity.description ?? "") +
    section("Fields", (() => {
      const entityFields = fieldsByEntity.get(entity.id) ?? [];
      if (entityFields.length === 0) return p("No fields defined yet.");
      return table(
        ["Name", "Type", "PK", "UK", "Nullable"],
        entityFields.map((f) => [f.name, f.data_type, f.is_primary_key ? "✓" : "", f.is_unique ? "✓" : "", f.nullable ? "yes" : "no"]),
      );
    })()),
  ).join("\n");

  const body =
    p("# Low-Level Design (LLD)") +
    section("Modules", modules.length === 0
      ? p("No modules defined yet.")
      : table(["ID", "Module", "Owner", "Status"], modules.map((m) => [m.id, m.name, m.owner_role ?? "—", statusBadge(m.status)]))) +
    section("Data Model", entitySections || p("No entities defined yet.")) +
    section("Relations", relations.length === 0
      ? p("No entity relations defined yet.")
      : table(
          ["ID", "From", "To", "Type", "Description"],
          relations.map((r) => [r.id, r.from_entity_id, r.to_entity_id, r.relation_type, r.description ?? "—"]),
        ));

  return frontmatterFor(ctx, "Low-Level Design", "plan") + body;
}

export function genWorkflowsDoc(ctx: GeneratorContext): string {
  const workflows = listWorkflows(ctx.db, ctx.projectId);
  const graphs = listGraphs(ctx.db, ctx.projectId, "workflow");
  const calls = workflowCallsForProject(ctx.db, ctx.projectId);

  const graphSections = graphs.map((graph) => {
    const nodes = toDiagramNodes(graphNodes(ctx.db, graph.id));
    const edges = toDiagramEdges(graphEdges(ctx.db, graph.id));
    const result = generateWorkflow(nodes, edges, resolveCrossProjectCalls(ctx.db, nodes));
    return h(3, `${graph.id} — ${graph.name}`) +
      p(`Status: ${statusBadge(graph.status)}${graph.description ? " · " + graph.description : ""}`) +
      mermaidBlock(result.mermaid) +
      (result.warnings.length > 0
        ? p("Warnings: " + ul(result.warnings.map((w) => `[${w.level}] ${w.message}`)))
        : "");
  }).join("\n");

  const callSections = graphs
    .map((graph) => {
      const graphCalls = calls.filter((c) => c.workflow_id === graph.id);
      if (graphCalls.length === 0) return "";
      return h(3, `${graph.id} — ${graph.name}`) +
        table(
          ["Caller node", "Target project", "Target workflow"],
          graphCalls.map((c) => [
            `${c.node_id} (${c.node_title})`,
            `${c.target_project_id} — ${c.target_project_name}`,
            `${c.target_graph_id} — ${c.target_graph_name}`,
          ]),
        );
    })
    .join("\n");

  const body =
    p("# Workflows") +
    section("Workflow Models", graphs.length === 0
      ? (workflows.length === 0
          ? p("No workflows defined yet. Model workflows visually in the Visual Modeler (Prompt 07 surface).")
          : p("Workflow records exist but no visual models yet: " + ul(workflows.map((w) => `${w.id} — ${w.name} (${statusBadge(w.status)})`))))
      : graphSections) +
    (calls.length > 0
      ? section("Cross-project Calls", p("These workflows call workflows located in other projects (workflow_call nodes):") + callSections)
      : "") +
    section("Rules", ul([
      "Every workflow has a start and an end.",
      "Decision nodes require conditions on outgoing edges (TR-04).",
      "Cross-project workflow calls point at a workflow-kind graph of another project (TR-21).",
      "Diagrams are generated from structured data — never hand-written Mermaid.",
    ]));

  return frontmatterFor(ctx, "Workflows", "index", { related: workflows.map((w) => w.id) }) + body;
}

export function genProjectDependencies(ctx: GeneratorContext): string {
  const outgoing = listProjectDependencies(ctx.db, ctx.projectId);
  const inbound = listProjectDependents(ctx.db, ctx.projectId);
  const body =
    p("# Project Dependencies") +
    section("Purpose", p("Explicit, declared links between projects in this workspace (Prompt 14). A dependency means this project relies on the target project — for workflow calls, shared data, deployment, or other reasons. Per-project exports stay isolated: this file lists the dependency metadata only, never the target project's artifacts.")) +
    section("Outgoing Dependencies", outgoing.length === 0
      ? p("No outgoing dependencies declared yet.")
      : table(
          ["ID", "Depends on", "Kind", "Note"],
          outgoing.map((d) => [
            d.id,
            `${d.depends_on_project_id} — ${d.depends_on_project_name} (${statusBadge(d.depends_on_project_type)}, ${statusBadge(d.depends_on_project_status)})`,
            `\`${d.kind}\``,
            d.note ?? "—",
          ]),
        )) +
    section("Incoming Dependents", inbound.length === 0
      ? p("No projects declare a dependency on this project.")
      : table(
          ["ID", "Depending project", "Kind", "Note"],
          inbound.map((d) => [
            d.id,
            `${d.depending_project_id} — ${d.depending_project_name} (${statusBadge(d.depending_project_type)}, ${statusBadge(d.depending_project_status)})`,
            `\`${d.kind}\``,
            d.note ?? "—",
          ]),
        )) +
    section("Kinds", table(
      ["Kind", "Meaning"],
      [
        ["workflow_call", "The project calls workflows of the target project (workflow_call nodes)."],
        ["data", "The project shares or consumes the target project's data model."],
        ["deploy", "The project deploys to shared infrastructure with the target project."],
        ["other", "Any other declared dependency."],
      ],
    ));

  return frontmatterFor(ctx, "Project Dependencies", "index") + body;
}

export function genSkillsDoc(ctx: GeneratorContext): string {
  const skills = listSkills(ctx.db, ctx.projectId);
  const capability = skills.filter((s) => s.kind === "capability");
  const tech = skills.filter((s) => s.kind === "tech");

  const body =
    p("# Skills") +
    section("Purpose", p("The capabilities and technologies this project relies on (Prompt 16). Capability skills carry a proficiency level; tech skills carry a practical tag. Skills are project-specific — each project exports its own skills.")) +
    section(
      "Capability Skills",
      capability.length === 0
        ? p("No capability skills defined yet.")
        : table(
            ["ID", "Skill", "Level", "Description"],
            capability.map((s) => [s.id, s.name, `\`${s.level}\``, s.description || "—"]),
          ),
    ) +
    section(
      "Tech Skills",
      tech.length === 0
        ? p("No tech skills defined yet.")
        : table(
            ["ID", "Skill", "Tag", "Description"],
            tech.map((s) => [s.id, s.name, s.tag ? `\`${s.tag}\`` : "—", s.description || "—"]),
          ),
    ) +
    section("Task Tie-in", skills.length === 0
      ? p("Task packs do not reference skills until this project defines some.")
      : p(`Agents executing this project's task packs should be competent in: ${[...capability.map((s) => s.name), ...tech.map((s) => s.name)].join(", ")}.`));

  return frontmatterFor(ctx, "Skills", "index") + body;
}

export function genErdDoc(ctx: GeneratorContext): string {
  const { entities, relations } = erdFromTables(ctx.db, ctx.projectId);
  const result = generateErd(entities, relations);

  const body =
    p("# Entity-Relationship Model (ERD)") +
    section("Diagram", entities.length === 0
      ? p("No entities defined yet.")
      : mermaidBlock(result.mermaid)) +
    section("Warnings", result.warnings.length === 0
      ? p("No warnings.")
      : ul(result.warnings.map((w) => `[${w.level}] ${w.message}`))) +
    section("Entities", entities.length === 0
      ? p("No entities defined yet.")
      : table(
          ["ID", "Entity", "Fields"],
          entities.map((e) => [e.id, e.name, e.fields.length]),
        )) +
    section("Relations", relations.length === 0
      ? p("No relations defined yet.")
      : table(
          ["ID", "From", "To", "Cardinality", "Description"],
          relations.map((r) => [r.id, r.from, r.to, r.relation_type, r.description ?? "—"]),
        ));

  return frontmatterFor(ctx, "Entity-Relationship Model", "index") + body;
}

export function genApiDoc(ctx: GeneratorContext): string {
  const endpoints = listApiEndpoints(ctx.db, ctx.projectId);
  const body =
    p("# API Documentation") +
    section("Endpoints", endpoints.length === 0
      ? p("No API endpoints defined yet.")
      : endpoints.map((api) =>
          h(3, `${api.method} ${api.path}`) +
          p(`- ID: \`${api.id}\` · Status: ${statusBadge(api.status)}`) +
          p(`Purpose: ${api.purpose ?? "—"}`) +
          p(`Auth: ${api.auth ?? "—"}`) +
          (api.request_schema ? p("Request:") + codeBlock("json", JSON.stringify(parseJson(api.request_schema), null, 2)) : "") +
          (api.response_schema ? p("Response:") + codeBlock("json", JSON.stringify(parseJson(api.response_schema), null, 2)) : "") +
          (api.error_codes
            ? p("Errors:") + ul(parseJsonArray<{ code: string; description?: string }>(api.error_codes).map((e) => `${e.code} — ${e.description ?? ""}`))
            : ""),
        ).join("\n"));

  return frontmatterFor(ctx, "API Documentation", "index") + body;
}

export function genScreensDoc(ctx: GeneratorContext): string {
  const screens = listScreens(ctx.db, ctx.projectId);
  const body =
    p("# Screen Specifications") +
    section("Screens", screens.length === 0
      ? p("No screens defined yet.")
      : table(
          ["ID", "Screen", "Route", "Description", "Status"],
          screens.map((s) => [s.id, s.name, s.route ?? "—", s.description ?? "—", statusBadge(s.status)]),
        )) +
    section("Modeling", p("Screens can be modeled visually as `screen` nodes in workflow and architecture graphs (Visual Modeler)."));

  return frontmatterFor(ctx, "Screen Specifications", "index") + body;
}

export function genSequencesDoc(ctx: GeneratorContext): string {
  const graphs = listGraphs(ctx.db, ctx.projectId, "sequence");
  const sections = graphs.map((graph) => {
    const result = generateSequence(toDiagramNodes(graphNodes(ctx.db, graph.id)), toDiagramEdges(graphEdges(ctx.db, graph.id)), "sequence");
    return h(3, `${graph.id} — ${graph.name}`) + mermaidBlock(result.mermaid);
  }).join("\n");

  const body =
    p("# Sequence Diagrams") +
    section("Models", graphs.length === 0
      ? p("No sequence models defined yet. Model them in the Visual Modeler (kind: Sequence).")
      : sections);

  return frontmatterFor(ctx, "Sequence Diagrams", "index", { related: graphs.map((g) => g.id) }) + body;
}

export function genTestPlan(ctx: GeneratorContext): string {
  const testCases = listTestCases(ctx.db, ctx.projectId);
  const body =
    p("# Test Plan") +
    section("Strategy", ul([
      "Unit tests for backend modules and repositories.",
      "Smoke tests covering the public API surface (in-process Fastify inject).",
      "Type-level verification via `tsc --noEmit`.",
      "Manual acceptance testing against the definition of done.",
    ])) +
    section("Scope", p(`Planned coverage: ${testCases.length} test case(s) recorded. Test cases are listed in 05-testing/test-cases.md.`)) +
    section("Gate Criteria", ul([
      "All smoke tests pass.",
      "No unverified critical requirements.",
      "Typecheck clean for root, backend, and frontend.",
    ]));

  return frontmatterFor(ctx, "Test Plan", "plan") + body;
}

export function genTestCases(ctx: GeneratorContext): string {
  const testCases = listTestCases(ctx.db, ctx.projectId);
  const body =
    p("# Test Cases") +
    section("Test Cases", testCases.length === 0
      ? p("No test cases defined yet.")
      : testCases.map((tc) =>
          h(3, `${tc.id} — ${tc.title}`) +
          p(`- Type: ${tc.test_type ?? "—"} · Result: ${tc.result ?? "—"} · Status: ${statusBadge(tc.status)}`) +
          p(`Precondition: ${tc.precondition ?? "—"}`) +
          p("Steps:") + ol(parseJsonArray<string>(tc.steps)) +
          p("Expected results:") + ul(parseJsonArray<string>(tc.expected_results)),
        ).join("\n")) +
    section("Templates", p("Use 05-testing/templates/bug-report.md for defect reports."));

  return frontmatterFor(ctx, "Test Cases", "index") + body;
}

export function genBugReportTemplate(ctx: GeneratorContext): string {
  const body =
    p("# Bug Report Template") +
    p("> This file is marked `<!-- protected -->` so manual edits survive regeneration.") +
    divider() +
    codeBlock("markdown", [
      "---",
      "title: \"[BUG] Short summary\"",
      "type: bug-report",
      "status: open",
      "related: []",
      "---",
      "",
      "## Environment",
      "- Version / commit:",
      "- Browser / runtime:",
      "",
      "## Steps to reproduce",
      "1.",
      "2.",
      "3.",
      "",
      "## Expected behavior",
      "",
      "## Actual behavior",
      "",
      "## Evidence",
      "- Logs / screenshots:",
      "",
      "## Impact",
      "- Severity (low/medium/high/critical):",
      "- Affected requirement/task IDs:",
    ].join("\n")) +
    section("Instructions", ul([
      "Fill a copy of the template for every defect.",
      "Link the affected artifact IDs for traceability.",
      "Attach evidence (logs, screenshots) before closing.",
    ]));

  return frontmatterFor(ctx, "Bug Report Template", "guide") + body;
}

export function genDeveloperGuide(ctx: GeneratorContext): string {
  const body =
    p("# Developer Guide") +
    section("Stack", table(
      ["Layer", "Technology"],
      [
        ["Frontend", "React 18 · TypeScript · Vite · Tailwind CSS · Feature-Sliced Design"],
        ["Backend", "Node.js · TypeScript · Fastify · Zod"],
        ["Database", "SQLite (bun:sqlite)"],
        ["Diagrams", "Mermaid (generated)"],
      ],
    )) +
    section("Repository Layout", codeBlock("text", [
      "backend/          Fastify API, SQLite, smoke tests",
      "  src/modules/    feature modules (routes/service/repository)",
      "  db/             schema.sql + additive migrations",
      "frontend/         React FSD app",
      "  src/app         providers, router, global styles",
      "  src/pages       route pages",
      "  src/features    interactive features (visual modeler, diagrams)",
      "  src/entities    domain models + query hooks",
      "  src/shared      ui primitives, api client, config",
    ].join("\n"))) +
    section("Commands", codeBlock("bash", [
      "bun install                # install workspaces",
      "bun run dev                # backend + frontend concurrently",
      "bun run --cwd backend smoke  # API smoke tests",
      "bun tsc -b --noEmit        # full typecheck",
    ].join("\n"))) +
    section("Conventions", ul([
      "Stable public IDs everywhere (docs/ontology/id-convention.md).",
      "Additive-only database migrations; destructive changes need approval.",
      "The database is the source of truth; Markdown is generated output.",
      "Generated docs are English-only with YAML frontmatter.",
    ]));

  return frontmatterFor(ctx, "Developer Guide", "guide") + body;
}

export function genDeploymentGuide(ctx: GeneratorContext): string {
  const project = getProject(ctx.db, ctx.projectId);
  const body =
    p("# Deployment Guide") +
    section("Prerequisites", ul([
      "Bun runtime (v1.x) for local runs; Freebuff hosting for production.",
      "Environment: PORT, HOST, DATABASE_PATH, EXPORT_DIR, LOG_LEVEL.",
    ])) +
    section("Build", codeBlock("bash", [
      "bun install",
      "bun run build   # frontend static output in frontend/dist",
    ].join("\n"))) +
    section("Run", codeBlock("bash", [
      "bun run dev     # local dev (backend :3000 + frontend :5173)",
      "bun run --cwd backend start",
    ].join("\n"))) +
    section("Database", ul([
      `Database file: \`DATABASE_PATH\` (default data/specforge.db).`,
      "Schema is applied idempotently at startup; migrations are additive.",
      "Back up the SQLite file before destructive operations.",
    ])) +
    section("Export Output", p(`Generated workspaces are written under \`EXPORT_DIR\` (default data/exports) as folder output.`)) +
    section("Post-Deploy Checks", ul([
      "GET /healthz returns ok.",
      "Smoke tests pass against the deployed API.",
      `Project: ${project.id} · ${project.name}`,
    ]));

  return frontmatterFor(ctx, "Deployment Guide", "guide") + body;
}

export function genUserGuide(ctx: GeneratorContext): string {
  const body =
    p("# User Guide") +
    section("Workflow", ol([
      "Create a project (Dashboard → New project).",
      "Model workflows, data, architecture, and sequences on the Visual Modeler canvas.",
      "Run validation and save the graph.",
      "Generate diagrams from the model (Diagrams page or canvas Preview diagram).",
      "Generate the Markdown workspace (Docs Export page).",
      "Track tasks and approvals; execute task packs with agents.",
    ])) +
    section("Key Concepts", ul([
      "Models are structured data — you never write Mermaid.",
      "Every artifact has a stable ID for traceability.",
      "Approval gates protect final requirements, architecture, and schema.",
    ]));

  return frontmatterFor(ctx, "User Guide", "guide") + body;
}

export function genAdrs(ctx: GeneratorContext): string {
  const decisions = listDecisions(ctx.db, ctx.projectId);
  const body =
    p("# Architecture Decision Records (ADRs)") +
    section("Decisions", decisions.length === 0
      ? p("No decisions recorded yet.")
      : decisions.map((adr) =>
          h(3, `${adr.id} — ${adr.title}`) +
          p(`Status: ${statusBadge(adr.status)}`) +
          p(`Context: ${adr.context ?? "—"}`) +
          p(`Decision: ${adr.decision}`) +
          (adr.alternatives ? p("Alternatives:") + ul(parseJsonArray<string>(adr.alternatives)) : "") +
          (adr.consequences ? p(`Consequences: ${adr.consequences}`) : ""),
        ).join("\n"));

  return frontmatterFor(ctx, "Architecture Decision Records", "index") + body;
}

export function genApprovals(ctx: GeneratorContext): string {
  const approvals = listApprovals(ctx.db, ctx.projectId);
  const body =
    p("# Approvals") +
    section("Approval Gates", approvals.length === 0
      ? p("No approvals recorded yet.")
      : table(
          ["ID", "Artifact", "Approver role", "Status", "Decision", "Date"],
          approvals.map((a) => [a.id, `${a.artifact_id} (${a.artifact_type})`, a.approver_role, statusBadge(a.status), a.decision ?? "—", dateOnly(a.created_at)]),
        )) +
    section("Rules", ul([
      "Final requirements, architecture, schema, and API contracts require approval.",
      "Approvals are recorded (APR) and referenced from artifacts.",
    ]));

  return frontmatterFor(ctx, "Approvals", "index") + body;
}

export function genMasterPlan(ctx: GeneratorContext): string {
  const milestones = listMilestones(ctx.db, ctx.projectId);
  const tasks = listTasks(ctx.db, ctx.projectId);
  const body =
    p("# Master Plan") +
    section("Phases", ol([
      "01 — Definition (requirements, scope, risks)",
      "02 — Design (HLD, LLD, data model, workflows)",
      "03 — Implementation (backend, frontend, integrations)",
      "04 — Validation (tests, review, approvals)",
      "05 — Delivery (deployment, docs, handoff)",
    ])) +
    section("Milestones", milestones.length === 0
      ? p("No milestones defined yet.")
      : ul(milestones.map((m) => `${m.id} — ${m.name} (${m.status})`))) +
    section("Progress", p(table(
      ["Metric", "Value"],
      [
        ["Tasks", tasks.length],
        ["Done", tasks.filter((t) => t.status === "done").length],
        ["Open", tasks.filter((t) => t.status === "open").length],
      ],
    ))) +
    section("Execution", p("Agents execute task packs from 09-agent-plans/tasks.md and checklists from 09-agent-plans/checklists.md. See 09-agent-plans/agent-guide.md."));

  return frontmatterFor(ctx, "Master Plan", "plan") + body;
}

export function genTasks(ctx: GeneratorContext): string {
  const tasks = listTasks(ctx.db, ctx.projectId);
  const checklists = listChecklists(ctx.db);
  const checklistsByTask = new Map<string, ChecklistRow[]>();
  for (const item of checklists) {
    checklistsByTask.set(item.task_id, [...(checklistsByTask.get(item.task_id) ?? []), item]);
  }

  const body =
    p("# Task Packs") +
    section("Tasks", tasks.length === 0
      ? p("No tasks defined yet.")
      : tasks.map((task) =>
          h(3, `${task.id} — ${task.title}`) +
          p(`- Type: ${task.type ?? "spec"} · Priority: ${task.priority} · Status: ${statusBadge(task.status)}`) +
          p(`Objective: ${task.objective}`) +
          (task.context ? p(`Context: ${task.context}`) : "") +
          (task.constraints ? p("Constraints:") + ul(parseJsonArray<string>(task.constraints)) : "") +
          (task.input_artifacts ? p("Input artifacts:") + ul(parseJsonArray<string>(task.input_artifacts)) : "") +
          (task.approval_required ? p("Approval required before completion.") : "") +
          p("Definition of done: " + task.definition_of_done) +
          section("Checklist", (() => {
            const items = checklistsByTask.get(task.id) ?? [];
            if (items.length === 0) return p("No checklist items.");
            return ol(items.map((item) => `${item.description}${item.verification_hint ? ` *(verify: ${item.verification_hint})*` : ""}`));
          })()),
        ).join("\n"));

  return frontmatterFor(ctx, "Task Packs", "index") + body;
}

export function genChecklists(ctx: GeneratorContext): string {
  const tasks = listTasks(ctx.db, ctx.projectId);
  const checklists = listChecklists(ctx.db);
  const byTask = new Map<string, ChecklistRow[]>();
  for (const item of checklists) {
    byTask.set(item.task_id, [...(byTask.get(item.task_id) ?? []), item]);
  }

  const sections = tasks.map((task) => {
    const items = byTask.get(task.id) ?? [];
    if (items.length === 0) return "";
    return h(3, `${task.id} — ${task.title} (${task.status})`) +
      ul(items.map((item) => `${item.description} — [ ]`));
  }).filter(Boolean).join("\n");

  const body =
    p("# Executable Checklists") +
    p("Agent-neutral checklists. Complete each item in order; verify before marking done.") +
    (sections || p("No checklists defined yet."));

  return frontmatterFor(ctx, "Executable Checklists", "index") + body;
}

export function genAgentGuide(ctx: GeneratorContext): string {
  const body =
    p("# Agent Guide — Executing Task Packs") +
    section("How to Execute", ol([
      "Read 09-agent-plans/tasks.md and pick the highest-priority open task.",
      "Read the task's objective, context, constraints, and input artifacts.",
      "Follow the checklist in order; verify each item (hint in parentheses).",
      "Complete the definition of done before marking the task done.",
      "Update the checklist and task status, then record results.",
    ])) +
    section("Ground Rules", ul([
      "Never edit generated files unless they are marked `<!-- protected -->`.",
      "Never invent requirements — the SRS is the source of requirements.",
      "Reference artifacts by canonical ID.",
      "Ask for approval when a task is marked approval_required.",
    ])) +
    section("Verification", p("Run `bun tsc -b --noEmit` and the backend smoke tests before declaring backend work done."));

  return frontmatterFor(ctx, "Agent Guide", "guide") + body;
}
