import type { Database } from "bun:sqlite";
import { isProtectedContent } from "./markdown";
import type { GeneratorContext } from "./generators";
import {
  genAdrs,
  genAgents,
  genAgentGuide,
  genApiDoc,
  genApprovals,
  genBugReportTemplate,
  genCharter,
  genChecklists,
  genDeploymentGuide,
  genDeveloperGuide,
  genErdDoc,
  genGlossary,
  genHld,
  genIdRegistry,
  genLld,
  genMasterPlan,
  genMilestones,
  genProjectDependencies,
  genProjectMeta,
  genReadme,
  genRiskRegister,
  genScreensDoc,
  genScope,
  genSequencesDoc,
  genSrs,
  genTasks,
  genTestCases,
  genTestPlan,
  genTraceability,
  genUseCases,
  genUserGuide,
  genVision,
  genWorkflowsDoc,
  genSkillsDoc,
  genIssuesDoc,
  genReleasesDoc,
} from "./generators";

export interface WorkspaceFile {
  path: string;
  content: string;
  bytes: number;
}

export interface WorkspaceFileSpec {
  path: string;
  type: string;
  title: string;
  generate: (ctx: GeneratorContext) => string;
}

/**
 * The canonical generated workspace file set (WS-001 structure). The order is
 * fixed so every file receives a stable ART id (ART-0001 …) that never shifts
 * when new files are appended at the end.
 */
export const WORKSPACE_FILES: WorkspaceFileSpec[] = [
  { path: "README.md", type: "index", title: "Project Workspace", generate: genReadme },
  { path: "AGENTS.md", type: "guide", title: "Workspace Agent Guide", generate: genAgents },
  { path: "00-meta/project.md", type: "project", title: "Project Profile", generate: genProjectMeta },
  { path: "00-meta/id-registry.md", type: "index", title: "ID Registry", generate: genIdRegistry },
  { path: "00-meta/glossary.md", type: "index", title: "Glossary", generate: genGlossary },
  { path: "01-planning/project-charter.md", type: "plan", title: "Project Charter", generate: genCharter },
  { path: "01-planning/vision.md", type: "plan", title: "Vision", generate: genVision },
  { path: "01-planning/scope.md", type: "plan", title: "Scope", generate: genScope },
  { path: "01-planning/risk-register.md", type: "index", title: "Risk Register", generate: genRiskRegister },
  { path: "01-planning/milestones.md", type: "index", title: "Milestones", generate: genMilestones },
  { path: "02-requirements/srs.md", type: "index", title: "Software Requirements Specification", generate: genSrs },
  { path: "02-requirements/use-cases.md", type: "index", title: "Use Cases", generate: genUseCases },
  { path: "02-requirements/traceability.md", type: "index", title: "Traceability Report", generate: genTraceability },
  { path: "03-design/hld.md", type: "plan", title: "High-Level Design", generate: genHld },
  { path: "03-design/lld.md", type: "plan", title: "Low-Level Design", generate: genLld },
  { path: "03-design/workflows.md", type: "index", title: "Workflows", generate: genWorkflowsDoc },
  { path: "03-design/erd.md", type: "index", title: "Entity-Relationship Model", generate: genErdDoc },
  { path: "03-design/api.md", type: "index", title: "API Documentation", generate: genApiDoc },
  { path: "03-design/sequences.md", type: "index", title: "Sequence Diagrams", generate: genSequencesDoc },
  { path: "04-ui/screens.md", type: "index", title: "Screen Specifications", generate: genScreensDoc },
  { path: "05-testing/test-plan.md", type: "plan", title: "Test Plan", generate: genTestPlan },
  { path: "05-testing/test-cases.md", type: "index", title: "Test Cases", generate: genTestCases },
  { path: "05-testing/templates/bug-report.md", type: "guide", title: "Bug Report Template", generate: genBugReportTemplate },
  { path: "06-ops/deployment-guide.md", type: "guide", title: "Deployment Guide", generate: genDeploymentGuide },
  { path: "07-guides/developer-guide.md", type: "guide", title: "Developer Guide", generate: genDeveloperGuide },
  { path: "07-guides/user-guide.md", type: "guide", title: "User Guide", generate: genUserGuide },
  { path: "08-governance/adrs.md", type: "index", title: "Architecture Decision Records", generate: genAdrs },
  { path: "08-governance/approvals.md", type: "index", title: "Approvals", generate: genApprovals },
  { path: "09-agent-plans/master-plan.md", type: "plan", title: "Master Plan", generate: genMasterPlan },
  { path: "09-agent-plans/tasks.md", type: "index", title: "Task Packs", generate: genTasks },
  { path: "09-agent-plans/checklists.md", type: "index", title: "Executable Checklists", generate: genChecklists },
  { path: "09-agent-plans/agent-guide.md", type: "guide", title: "Agent Guide", generate: genAgentGuide },
  // Prompt 14: appended at the end so existing ART ids never shift.
  { path: "00-meta/dependencies.md", type: "index", title: "Project Dependencies", generate: genProjectDependencies },
  // Prompt 16: per-project Skills section; appended at the end so ART ids stay stable.
  { path: "07-guides/skills.md", type: "index", title: "Skills", generate: genSkillsDoc },
  // Prompt 20: execution and delivery; appended at the end so ART ids stay stable.
  { path: "05-testing/issues.md", type: "index", title: "Issues", generate: genIssuesDoc },
  { path: "06-ops/releases.md", type: "index", title: "Releases", generate: genReleasesDoc },
];

/**
 * Generates the full workspace. When `preserveFrom` is provided (files of a
 * previous export), any file whose previous content carries the protected
 * marker is reused verbatim so manual edits survive regeneration.
 */
export function generateWorkspaceFiles(
  db: Database,
  projectId: string,
  options: { preserveFrom?: WorkspaceFile[]; exportDate?: string } = {},
): WorkspaceFile[] {
  const exportDate = options.exportDate ?? new Date().toISOString().slice(0, 10);
  return WORKSPACE_FILES.map((spec, index) => {
    const ctx: GeneratorContext = {
      db,
      projectId,
      artifactId: `ART-${String(index + 1).padStart(4, "0")}`,
      exportDate,
    };
    const generated = spec.generate(ctx);
    const previous = options.preserveFrom?.find((file) => file.path === spec.path);
    const content = previous && isProtectedContent(previous.content) ? previous.content : generated;
    return { path: spec.path, content, bytes: Buffer.byteLength(content, "utf8") };
  });
}
