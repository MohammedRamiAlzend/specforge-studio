/**
 * Global cross-artifact search (Prompt 20).
 *
 * Searches title/name/description/path fields across project-scoped artifact
 * tables and returns typed, deduplicated results. Kept simple: case-insensitive
 * LIKE matching over a fixed set of (table, id column, text columns) targets.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";

interface SearchTarget {
  type: string;
  table: string;
  idColumn: string;
  textColumns: string[];
  projectColumn?: string;
}

const TARGETS: SearchTarget[] = [
  { type: "project", table: "projects", idColumn: "id", textColumns: ["name", "description"] },
  { type: "module", table: "modules", idColumn: "id", textColumns: ["name", "description"], projectColumn: "project_id" },
  { type: "requirement", table: "requirements", idColumn: "id", textColumns: ["title", "description"], projectColumn: "project_id" },
  { type: "use_case", table: "use_cases", idColumn: "id", textColumns: ["title"], projectColumn: "project_id" },
  { type: "workflow", table: "workflows", idColumn: "id", textColumns: ["name", "description"], projectColumn: "project_id" },
  { type: "entity", table: "entities", idColumn: "id", textColumns: ["name", "description"], projectColumn: "project_id" },
  { type: "api_endpoint", table: "api_endpoints", idColumn: "id", textColumns: ["path", "purpose"], projectColumn: "project_id" },
  { type: "screen", table: "screens", idColumn: "id", textColumns: ["name", "route"], projectColumn: "project_id" },
  { type: "task", table: "tasks", idColumn: "id", textColumns: ["title", "objective"], projectColumn: "project_id" },
  { type: "issue", table: "issues", idColumn: "id", textColumns: ["title", "description"], projectColumn: "project_id" },
  { type: "release", table: "releases", idColumn: "id", textColumns: ["version", "name", "notes"], projectColumn: "project_id" },
  { type: "skill", table: "skills", idColumn: "id", textColumns: ["name", "tag", "description"], projectColumn: "project_id" },
  { type: "team_member", table: "team_members", idColumn: "id", textColumns: ["name", "email", "role"], projectColumn: "project_id" },
];

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  project_id: string | null;
}

export function searchArtifacts(
  db: Database,
  q: string,
  projectId?: string,
  limit = 50,
): SearchResult[] {
  const needle = q.trim();
  if (!needle) return [];

  const results: SearchResult[] = [];
  const like = `%${needle}%`;

  for (const target of TARGETS) {
    const textWhere = target.textColumns.map((c) => `${c} LIKE ?`).join(" OR ");
    const conditions: string[] = [`(${textWhere})`];
    const values: (string | null)[] = [];
    for (const _ of target.textColumns) values.push(like);
    if (projectId && target.projectColumn) {
      conditions.push(`${target.projectColumn} = ?`);
      values.push(projectId);
    }
    const rows = db
      .query(`SELECT ${target.idColumn} AS id, ${target.textColumns[0]} AS title, ${target.projectColumn ?? "NULL"} AS project_id
              FROM ${target.table} WHERE ${conditions.join(" AND ")} LIMIT ?`)
      .all(...values, limit) as { id: string; title: string; project_id: string | null }[];
    for (const row of rows) {
      results.push({
        type: target.type,
        id: row.id,
        title: row.title ?? row.id,
        project_id: row.project_id,
      });
      if (results.length >= limit) return results;
    }
  }

  return results;
}

export function registerSearchRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/search", async (request) => {
    const query = z
      .object({
        q: z.string().min(1).max(300),
        project: z.string().regex(/^PRJ-\d{4,}$/).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(request.query);
    return { data: searchArtifacts(db, query.q, query.project, query.limit) };
  });
}