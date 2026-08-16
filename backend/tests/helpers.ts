/**
 * Shared test helpers (Prompt 12).
 *
 * Every test file boots its own app against a fresh in-memory database, so
 * IDs restart at -0001 per file and tests are fully deterministic.
 */
import type { Database } from "bun:sqlite";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import type { Config } from "../src/config/index";
import { openDatabase } from "../src/db/index";

export const TEST_CONFIG: Config = {
  PORT: 0,
  HOST: "127.0.0.1",
  DATABASE_PATH: ":memory:",
  EXPORT_DIR: "data/test-exports",
  LOG_LEVEL: "silent",
  NODE_ENV: "test",
};

export interface TestContext {
  db: Database;
  app: FastifyInstance;
  config: Config;
}

export function createTestContext(): Omit<TestContext, "app"> {
  const config: Config = { ...TEST_CONFIG };
  const db = openDatabase(":memory:");
  return { db, config };
}

export async function bootApp(ctx: Pick<TestContext, "db" | "config">): Promise<FastifyInstance> {
  return buildApp({ config: ctx.config, db: ctx.db });
}

/** Injects a request against the app (no server socket needed). */
export async function request(
  app: FastifyInstance,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  payload?: unknown,
): Promise<{
  statusCode: number;
  body: string;
  json: () => any;
}> {
  const res = await app.inject({
    method,
    url,
    payload: payload as undefined,
  });
  return {
    statusCode: res.statusCode,
    body: res.body,
    json: () => res.json(),
  };
}

/** Seeds a minimal project + one requirement (common base for most suites). */
export async function seedProject(app: FastifyInstance): Promise<string> {
  const res = await request(app, "POST", "/projects", {
    name: "Test app",
    type: "web",
    created_by: "tester@internal",
  });
  return res.json().data.id as string;
}

export async function seedRequirement(
  app: FastifyInstance,
  projectId: string,
  title = "Users must be able to log in",
  extra: Record<string, unknown> = {},
): Promise<string> {
  const res = await request(app, "POST", "/requirements", {
    project_id: projectId,
    title,
    priority: "must",
    criticality: "critical",
    ...extra,
  });
  return res.json().data.id as string;
}
