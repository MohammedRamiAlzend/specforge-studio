import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Database } from "bun:sqlite";
import type { Config } from "../config/index";
import { requireAdmin, requireUser } from "./auth";
import { assertProjectAccess } from "./projects";
import { badRequest } from "../utils/errors";

type RequestRecord = Record<string, unknown>;
type ProjectTable = { name: string };

function record(value: unknown): RequestRecord {
  return value && typeof value === "object" ? value as RequestRecord : {};
}

function buildProjectTables(db: Database): string[] {
  const tables = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as ProjectTable[];
  return tables.flatMap(({ name }) => {
    const columns = db.query(`PRAGMA table_info("${name.replaceAll('"', '""')}")`).all() as { name: string }[];
    return columns.some((column) => column.name === "project_id") && columns.some((column) => column.name === "id")
      ? [name]
      : [];
  });
}

function findProjectForArtifact(db: Database, tables: string[], artifactId: string): string | undefined {
  for (const table of tables) {
    const row = db.query(`SELECT project_id FROM "${table.replaceAll('"', '""')}" WHERE id = ? LIMIT 1`).get(artifactId) as
      | { project_id: string }
      | undefined;
    if (row?.project_id) return row.project_id;
  }
  return undefined;
}

function resolveProjectId(db: Database, tables: string[], request: FastifyRequest): string | undefined {
  const params = record(request.params);
  const query = record(request.query);
  const body = record(request.body);
  const direct = params.projectId ?? query.project ?? body.project_id;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const routeId = params.id;
  if (typeof routeId === "string" && /^PRJ-\d{4,}$/.test(routeId)) return routeId;
  if (typeof routeId === "string") return findProjectForArtifact(db, tables, routeId);
  return undefined;
}

function isMutation(request: FastifyRequest): boolean {
  return request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";
}

/** Registers secure project ownership checks for both direct and child-resource routes. */
export function registerAuthorizationHook(app: FastifyInstance, db: Database, config: Config): void {
  const projectTables = buildProjectTables(db);
  app.addHook("preHandler", async (request) => {
    if (!config.AUTH_REQUIRED || request.method === "OPTIONS") return;
    const [pathname = ""] = request.url.split("?", 1);
    const normalizedPathname = pathname.startsWith("/api/") ? pathname.slice(4) : pathname;
    if (normalizedPathname === "/healthz" || normalizedPathname === "/readyz" || normalizedPathname === "/plans" || normalizedPathname.startsWith("/auth/")) return;
    if (normalizedPathname.startsWith("/admin/")) {
      requireAdmin(db, request);
      return;
    }
    const user = requireUser(db, request);
    const projectId = resolveProjectId(db, projectTables, request);
    if (projectId) {
      assertProjectAccess(db, projectId, user.id, isMutation(request) ? "editor" : "viewer");
      return;
    }
    const isProjectCollection = normalizedPathname === "/projects";
    const isBilling = normalizedPathname.startsWith("/billing/");
    const isGlobalConfiguration = normalizedPathname.startsWith("/platform-config") || normalizedPathname.startsWith("/node-palette") || normalizedPathname === "/modeler/node-types";
    const isUserDashboard = normalizedPathname === "/dashboard/summary";
    const isLeonaProviderSettings = normalizedPathname === "/leona/providers" || normalizedPathname.startsWith("/leona/providers/");
    if (!isProjectCollection && !isBilling && !isGlobalConfiguration && !isUserDashboard && !isLeonaProviderSettings) {
      throw badRequest("Project scope is required for this resource.");
    }
  });
}
