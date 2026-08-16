/**
 * Generates docs/workspace/generated-example-ecommerce/ from the seeded
 * StoreSphere e-commerce demo project.
 *
 * Run: bun run --cwd backend seed-ecommerce-example
 * The output is the committed, regenerable example of a generated workspace
 * for the second demo. It uses PRJ-0004 / GRPH-0004 and the 0100+ child-ID
 * ranges so it never collides with the Acme example or user projects.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { openDatabase } from "../src/db/index";
import { generateWorkspaceFiles } from "../src/modules/docs-generator/workspace";
import { seedEcommerceProject } from "./seed-ecommerce";

const ECOMMERCE_PROJECT_ID = "PRJ-0004";
const ECOMMERCE_GRAPH_ID = "GRPH-0004";

const db = openDatabase(":memory:");
seedEcommerceProject(db, { projectId: ECOMMERCE_PROJECT_ID, graphId: ECOMMERCE_GRAPH_ID });

const files = generateWorkspaceFiles(db, ECOMMERCE_PROJECT_ID);
const outDir = join(import.meta.dir, "../../docs/workspace/generated-example-ecommerce");
rmSync(outDir, { recursive: true, force: true });
for (const file of files) {
  const fullPath = join(outDir, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.content, "utf8");
}
console.log(`Wrote ${files.length} files to docs/workspace/generated-example-ecommerce/`);