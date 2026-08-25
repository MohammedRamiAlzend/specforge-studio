/**
 * Pitch deck / presentation module (DEC-030 Phase B).
 *
 * The deck is COMPUTED LIVE from project data on every request — no
 * persistence table, no stale snapshots. The same slide outline feeds:
 *   * GET /presentation/:projectId/data  -> JSON for the in-app slide viewer
 *   * GET /presentation/:projectId/pptx  -> real .pptx via pptxgenjs
 *     (the one runtime dependency explicitly approved by the user, DEC-030)
 *   * docs workspace `08-presentations/pitch-deck.md` (Markdown snapshot)
 */
import type { FastifyInstance } from "fastify";
import PptxGenJS from "pptxgenjs";
import type { Database } from "bun:sqlite";
import { z } from "zod";
import type { Deps } from "../types";
import { logEvent } from "../utils/events";
import { notFound } from "../utils/errors";
import { listBmcNotes, BMC_BLOCKS } from "./business-model";
import { computeProjectHealth } from "./health";

// ---------------------------------------------------------------------------
// Slide model
// ---------------------------------------------------------------------------

export interface DeckSlide {
  /** Stable slide kind used by the viewer to pick a layout. */
  kind:
    | "title"
    | "bmc_block"
    | "market"
    | "business_overview"
    | "features"
    | "architecture"
    | "roadmap"
    | "team"
    | "metrics";
  title: string;
  bullets: string[];
}

export interface PresentationData {
  project: { id: string; name: string; description: string | null; status: string };
  stacks: string[];
  slides: DeckSlide[];
  generated_at: string;
}

function truncate(text: string, max = 90): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const BLOCK_TITLES: Record<string, string> = {
  key_partners: "Key Partners",
  key_activities: "Key Activities",
  key_resources: "Key Resources",
  value_propositions: "Value Propositions",
  customer_relationships: "Customer Relationships",
  channels: "Channels",
  customer_segments: "Customer Segments",
  cost_structure: "Cost Structure",
  revenue_streams: "Revenue Streams",
};

function getProjectRow(db: Database, projectId: string): { id: string; name: string; description: string | null; status: string } {
  const row = db
    .query("SELECT id, name, description, status FROM projects WHERE id = ?")
    .get(projectId) as PresentationData["project"] | undefined;
  if (!row) throw notFound(`Project ${projectId} not found`);
  return row;
}

function listStackLabels(db: Database, projectId: string): string[] {
  const rows = db
    .query(
      `SELECT s.name AS stack_name FROM project_type_config ptc
       JOIN stacks s ON s.id = ptc.stack_id
       WHERE ptc.project_id = ? AND s.name IS NOT NULL`,
    )
    .all(projectId) as Array<{ stack_name: string }>;
  return rows.map((row) => row.stack_name);
}

/** Builds the canonical slide outline shared by viewer, .pptx and Markdown. */
export function buildPresentation(db: Database, projectId: string): PresentationData {
  const project = getProjectRow(db, projectId);
  const notes = listBmcNotes(db, projectId);
  const byBlock = new Map<string, string[]>();
  for (const block of BMC_BLOCKS) byBlock.set(block, []);
  for (const note of notes) byBlock.get(note.block)?.push(note.content);

  const slides: DeckSlide[] = [];

  // 1. Title
  slides.push({
    kind: "title",
    title: project.name,
    bullets: [
      ...(project.description ? [truncate(project.description, 160)] : []),
      ...(listStackLabels(db, projectId).length > 0
        ? [`Built with ${listStackLabels(db, projectId).join(" · ")}`]
        : []),
    ],
  });

  // 2. Value propositions
  slides.push({
    kind: "bmc_block",
    title: "Why We Win",
    bullets: byBlock.get("value_propositions")!.map((content) => truncate(content)),
  });

  // 3. Market: segments + channels
  slides.push({
    kind: "market",
    title: "Who We Serve",
    bullets: [
      ...byBlock.get("customer_segments")!.map((content) => truncate(content)),
      ...byBlock.get("channels")!.map((content) => `Reach: ${truncate(content)}`),
    ],
  });

  // 4. Business model overview (all nine blocks condensed)
  slides.push({
    kind: "business_overview",
    title: "Business Model Canvas",
    bullets: BMC_BLOCKS.map((block) => {
      const items = byBlock.get(block)!;
      return `${BLOCK_TITLES[block]!}: ${
        items.length === 0 ? "—" : truncate(items[0]!, 60) + (items.length > 1 ? ` (+${items.length - 1})` : "")
      }`;
    }),
  });

  // 5. Key features (top must/should functional requirements)
  const features = db
    .query(
      `SELECT title FROM requirements
       WHERE project_id = ? AND type = 'functional' AND priority IN ('must', 'should')
       ORDER BY CASE priority WHEN 'must' THEN 0 ELSE 1 END, id LIMIT 6`,
    )
    .all(projectId) as Array<{ title: string }>;
  slides.push({
    kind: "features",
    title: "Key Features",
    bullets:
      features.length === 0
        ? ["Define must-have requirements and they will appear here."]
        : features.map((row) => truncate(row.title)),
  });

  // 6. Architecture snapshot (artifact counts + chosen stacks)
  const count = (table: string): number =>
    (db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE project_id = ?`).get(projectId) as { n: number }).n;
  const stacks = listStackLabels(db, projectId);
  slides.push({
    kind: "architecture",
    title: "Architecture Snapshot",
    bullets: [
      ...(stacks.length > 0 ? [stacks.join(" · ")] : []),
      `${count("workflows")} workflows · ${count("entities")} data entities · ${count("api_endpoints")} API endpoints`,
      `${count("components")} architecture components · ${count("generated_diagrams")} diagrams`,
    ],
  });

  // 7. Roadmap milestones (both milestone stores, dated only)
  const milestones = db
    .query(
      `SELECT name, due_date, status FROM milestones
       WHERE project_id = ? AND due_date IS NOT NULL
       UNION ALL
       SELECT rm.name, rm.due_date, rm.status FROM roadmap_milestones rm
       JOIN roadmaps r ON r.id = rm.roadmap_id
       WHERE r.project_id = ? AND rm.due_date IS NOT NULL
       ORDER BY due_date LIMIT 6`,
    )
    .all(projectId, projectId) as Array<{ name: string; due_date: string; status: string }>;
  slides.push({
    kind: "roadmap",
    title: "Roadmap & Milestones",
    bullets:
      milestones.length === 0
        ? ["Generate a roadmap to schedule milestone gates."]
        : milestones.map((m) => `${m.due_date.slice(0, 10)} — ${m.name} (${m.status.replace(/_/g, " ")})`),
  });

  // 8. Team
  const team = db
    .query("SELECT name, role FROM team_members WHERE project_id = ? ORDER BY id LIMIT 6")
    .all(projectId) as Array<{ name: string; role: string }>;
  slides.push({
    kind: "team",
    title: "Team",
    bullets:
      team.length === 0
        ? ["Add team members to introduce the people behind the product."]
        : team.map((member) => `${member.name} · ${member.role.replace(/_/g, " ")}`),
  });

  // 9. Traction / delivery metrics
  const health = computeProjectHealth(db, projectId);
  slides.push({
    kind: "metrics",
    title: "Delivery Metrics",
    bullets: [
      `Requirements approved: ${health.requirements.approved}/${health.requirements.total} (${health.requirements.completion}%)`,
      `Tasks done: ${health.tasks.done}/${health.tasks.total} (${health.tasks.completion}%)`,
      `Milestones reached: ${health.milestones.reached}/${health.milestones.total}`,
      `Open issues: ${health.issues.open} · Releases shipped: ${health.releases.released}`,
    ],
  });

  return { project, stacks, slides, generated_at: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// PPTX rendering
// ---------------------------------------------------------------------------

async function renderPptx(deck: PresentationData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "SpecForge Studio";

  for (const slide of deck.slides) {
    const page = pptx.addSlide();
    if (slide.kind === "title") {
      page.background = { color: "0F172A" };
      page.addText(slide.title, {
        x: 0.6,
        y: 2.1,
        w: 8.4,
        fontSize: 40,
        bold: true,
        color: "FFFFFF",
      });
      page.addText(slide.bullets.join("\n"), {
        x: 0.6,
        y: 3.3,
        w: 8.4,
        fontSize: 14,
        color: "94A3B8",
      });
      continue;
    }
    page.background = { color: "FFFFFF" };
    page.addText(slide.title, {
      x: 0.6,
      y: 0.4,
      w: 8.8,
      fontSize: 28,
      bold: true,
      color: "0F172A",
    });
    page.addText(
      slide.bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
      { x: 0.7, y: 1.4, w: 8.6, fontSize: 14, color: "334155" },
    );
    page.addText(`${deck.project.name} · ${deck.project.id}`, {
      x: 0.6,
      y: 6.9,
      w: 8.8,
      fontSize: 9,
      color: "94A3B8",
    });
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

const idParamSchema = z.object({ projectId: z.string().regex(/^PRJ-\d{4,}$/) });

export function registerPresentationRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/presentation/:projectId/data", async (request) => {
    const { projectId } = idParamSchema.parse(request.params);
    return { data: buildPresentation(db, projectId) };
  });

  app.get("/presentation/:projectId/pptx", async (request, reply) => {
    const { projectId } = idParamSchema.parse(request.params);
    const deck = buildPresentation(db, projectId);
    const buffer = await renderPptx(deck);
    logEvent(db, {
      projectId,
      entityType: "presentation",
      entityId: projectId,
      action: "generated",
      actorType: "system",
      payload: { format: "pptx", slides: deck.slides.length },
    });
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    reply.header("Content-Disposition", `attachment; filename="${projectId}-pitch-deck.pptx"`);
    return reply.send(buffer);
  });
}
