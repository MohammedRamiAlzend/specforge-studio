/**
 * Generates docs/workspace/generated-example/ from a seeded demo project.
 * Run: bun run --cwd backend seed-example
 * The output is the committed, regenerable example of a generated workspace.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { openDatabase } from "../src/db/index";
import { generateWorkspaceFiles } from "../src/modules/docs-generator/workspace";
import { seedDemoProject } from "./seed-data";

const db = openDatabase(":memory:");
seedDemoProject(db);

const files = generateWorkspaceFiles(db, "PRJ-0001");
const outDir = join(import.meta.dir, "../../docs/workspace/generated-example");
rmSync(outDir, { recursive: true, force: true });
for (const file of files) {
  const fullPath = join(outDir, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.content, "utf8");
}
console.log(`Wrote ${files.length} files to docs/workspace/generated-example/`);
