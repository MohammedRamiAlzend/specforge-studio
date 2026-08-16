/**
 * Seeds the LIVE database (default data/specforge.db) with the StoreSphere
 * e-commerce example so the preview shows a second real end-to-end project.
 *
 * The demo is seeded as PRJ-0003 (graph GRPH-0003) with the 0100+ child-ID
 * ranges, so it coexists with the Acme Commerce demo (PRJ-0002) and any
 * project you already created in the preview (PRJ-0001). The roadmap is
 * auto-allocated (RMP-xxxx) and three diagrams (workflow + ERD + architecture)
 * are stored via the real routes so the Diagrams page is populated.
 *
 * Run: bun run --cwd backend seed-ecommerce-live
 * Idempotent: skips when PRJ-0003 already exists.
 */
import { buildApp } from "../src/app";
import { loadConfig } from "../src/config/index";
import { openDatabase } from "../src/db/index";
import { isEcommerceSeeded, seedEcommerceProject } from "./seed-ecommerce";

const ECOMMERCE_PROJECT_ID = "PRJ-0003";
const ECOMMERCE_GRAPH_ID = "GRPH-0003";

const config = loadConfig();
const db = openDatabase(config.DATABASE_PATH);

if (isEcommerceSeeded(db, ECOMMERCE_PROJECT_ID)) {
  console.log(`${ECOMMERCE_PROJECT_ID} already seeded in ${config.DATABASE_PATH} — skipping.`);
  process.exit(0);
}

const { projectId, roadmapId, taskCount } = seedEcommerceProject(db, {
  projectId: ECOMMERCE_PROJECT_ID,
  graphId: ECOMMERCE_GRAPH_ID,
});
console.log(`Seeded ${projectId} in ${config.DATABASE_PATH} (roadmap ${roadmapId}, ${taskCount} packaged tasks).`);

// Store three diagrams through the real routes so the Diagrams page is populated.
const app = await buildApp({ config: { ...config, LOG_LEVEL: "silent" }, db });
const workflow = await app.inject({
  method: "POST",
  url: "/diagrams/generate",
  payload: { project_id: projectId, diagram_type: "workflow", graph_id: ECOMMERCE_GRAPH_ID },
});
const erd = await app.inject({
  method: "POST",
  url: "/diagrams/generate",
  payload: { project_id: projectId, diagram_type: "erd" },
});
const architecture = await app.inject({
  method: "POST",
  url: "/diagrams/generate",
  payload: { project_id: projectId, diagram_type: "architecture" },
});
await app.close();

console.log(
  `Diagrams stored: ${workflow.statusCode === 201 ? workflow.json().data.id : `workflow ${workflow.statusCode}`}, ` +
    `${erd.statusCode === 201 ? erd.json().data.id : `erd ${erd.statusCode}`}, ` +
    `${architecture.statusCode === 201 ? architecture.json().data.id : `architecture ${architecture.statusCode}`}.`,
);
console.log("Open the preview: the dashboard shows StoreSphere E-Commerce Platform; try Workflows, Modeler, Diagrams, Roadmap, Governance, Docs.");