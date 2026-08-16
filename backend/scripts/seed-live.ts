/**
 * Seeds the LIVE database (default data/specforge.db) with the Acme Commerce
 * e-commerce example so the preview shows a real end-to-end project.
 *
 * The demo is seeded as PRJ-0002 (graph GRPH-0002) so it coexists with any
 * project you already created in the preview (PRJ-0001 and its graph are
 * never touched). Everything else uses the stable example IDs (REQ-0001,
 * DB-0001, TASK-0001, APR-0001, ...); the roadmap is auto-allocated
 * (RMP-xxxx) and two diagrams (workflow + ERD) are stored via the real
 * routes so the Diagrams page is populated.
 *
 * Run: bun run --cwd backend seed-live
 * Idempotent: skips when PRJ-0002 already exists.
 */
import { buildApp } from "../src/app";
import { loadConfig } from "../src/config/index";
import { openDatabase } from "../src/db/index";
import { isDemoProjectSeeded, seedDemoProject } from "./seed-data";

const DEMO_PROJECT_ID = "PRJ-0002";
const DEMO_GRAPH_ID = "GRPH-0002";

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);

if (isDemoProjectSeeded(db, DEMO_PROJECT_ID)) {
  console.log(`${DEMO_PROJECT_ID} already seeded in ${config.DATABASE_PATH} — skipping.`);
  process.exit(0);
}

const { projectId, roadmapId, taskCount } = seedDemoProject(db, {
  projectId: DEMO_PROJECT_ID,
  graphId: DEMO_GRAPH_ID,
});
console.log(`Seeded ${projectId} in ${config.DATABASE_PATH} (roadmap ${roadmapId}, ${taskCount} packaged tasks).`);

// Store two diagrams through the real routes so the Diagrams page is populated.
const app = await buildApp({ config: { ...config, LOG_LEVEL: "silent" }, db });
const workflow = await app.inject({
  method: "POST",
  url: "/diagrams/generate",
  payload: { project_id: projectId, diagram_type: "workflow", graph_id: DEMO_GRAPH_ID },
});
const erd = await app.inject({
  method: "POST",
  url: "/diagrams/generate",
  payload: { project_id: projectId, diagram_type: "erd" },
});
await app.close();

console.log(
  `Diagrams stored: ${workflow.statusCode === 201 ? workflow.json().data.id : `workflow ${workflow.statusCode}`}, ` +
    `${erd.statusCode === 201 ? erd.json().data.id : `erd ${erd.statusCode}`}.`,
);
console.log("Open the preview: the dashboard shows Acme Commerce Platform; try Workflows, Modeler, Diagrams, Roadmap, Governance, Docs.");
