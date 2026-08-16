import type { Database } from "bun:sqlite";
import { notFound } from "./errors";

export function assertProjectExists(db: Database, projectId: string): void {
  const row = db.query("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!row) {
    throw notFound(`Project ${projectId} not found`);
  }
}

export function assertModuleExists(db: Database, moduleId: string): void {
  const row = db.query("SELECT id FROM modules WHERE id = ?").get(moduleId);
  if (!row) {
    throw notFound(`Module ${moduleId} not found`);
  }
}
