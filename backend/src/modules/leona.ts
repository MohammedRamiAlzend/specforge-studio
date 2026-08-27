import type { FastifyInstance } from "fastify";
import type { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Deps } from "../types";
import { requireUser } from "./auth";
import { assertProjectAccess } from "./projects";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { AppError, badRequest, notFound } from "../utils/errors";

const providerSchema = z.enum(["openai", "anthropic", "gemini"]);
const connectionSchema = z.object({ provider: providerSchema, model: z.string().max(120).trim().default(""), base_url: z.string().url().max(500).optional(), api_key: z.string().min(12).max(500) });
const generationSchema = z.object({ project_id: z.string().regex(/^PRJ-\d{4,}$/), connection_id: z.string().regex(/^LPRV-\d{4,}$/).optional(), instruction: z.string().max(4000).trim().default("") });
const idSchema = z.object({ id: z.string().regex(/^LPRV-\d{4,}$/) });

const draftSchema = z.object({
  summary: z.string().min(1).max(4000),
  assumptions: z.array(z.string().max(500)).max(30).default([]),
  warnings: z.array(z.string().max(500)).max(30).default([]),
  requirements: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(2000), priority: z.enum(["low", "medium", "high", "critical"]).default("medium") })).max(100).default([]),
  workflows: z.array(z.object({ name: z.string().min(1).max(160), goal: z.string().max(1000), steps: z.array(z.string().max(500)).max(30) })).max(50).default([]),
  entities: z.array(z.object({ name: z.string().min(1).max(120), purpose: z.string().max(1000), fields: z.array(z.string().max(120)).max(50) })).max(50).default([]),
  api_endpoints: z.array(z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), path: z.string().max(240), purpose: z.string().max(1000) })).max(100).default([]),
  roadmap_tasks: z.array(z.object({ title: z.string().min(1).max(240), description: z.string().max(1000), priority: z.enum(["low", "medium", "high", "critical"]).default("medium") })).max(100).default([]),
  markdown_files: z.array(z.object({ path: z.string().regex(/^[a-zA-Z0-9_./-]+\.md$/), title: z.string().max(240), content: z.string().max(12000) })).max(50).default([]),
});

type ConnectionRow = { id: string; provider: z.infer<typeof providerSchema>; model: string; base_url: string; encrypted_key: string; iv: string; auth_tag: string; key_last4: string; status: "active" | "revoked"; created_at: string; updated_at: string };

function keyBytes(config: Deps["config"]): Buffer {
  const raw = (config as Deps["config"] & { LEONA_CREDENTIAL_KEY?: string }).LEONA_CREDENTIAL_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new AppError("INTERNAL_ERROR", "Leona provider credential storage is not configured.", 503, { code: "LEONA_CREDENTIAL_STORAGE_NOT_CONFIGURED" });
  return Buffer.from(raw, "hex");
}
function encryptKey(apiKey: string, config: Deps["config"]): { encrypted: string; iv: string; tag: string } { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyBytes(config), iv); const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]); return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") }; }
function decryptKey(row: ConnectionRow, config: Deps["config"]): string { const decipher = createDecipheriv("aes-256-gcm", keyBytes(config), Buffer.from(row.iv, "base64")); decipher.setAuthTag(Buffer.from(row.auth_tag, "base64")); return Buffer.concat([decipher.update(Buffer.from(row.encrypted_key, "base64")), decipher.final()]).toString("utf8"); }
function publicRow(row: ConnectionRow) { return { id: row.id, provider: row.provider, model: row.model, base_url: row.base_url, key_last4: row.key_last4, status: row.status, created_at: row.created_at, updated_at: row.updated_at }; }
function rows(db: Database, sql: string, ...args: (string | number)[]): unknown[] { try { return db.query(sql).all(...args) as unknown[]; } catch { return []; } }
function projectSnapshot(db: Database, projectId: string): Record<string, unknown> {
  const project = db.query("SELECT id, name, type, description, repository_url, status, created_at, updated_at FROM projects WHERE id = ?").get(projectId);
  return { project, business_model: rows(db, "SELECT block, content, color, sort_order FROM bmc_notes WHERE project_id = ? ORDER BY block, sort_order", projectId), requirements: rows(db, "SELECT id, title, description, priority, status FROM requirements WHERE project_id = ? ORDER BY id LIMIT 200", projectId), workflows: rows(db, "SELECT id, name, goal, status FROM workflows WHERE project_id = ? ORDER BY id LIMIT 100", projectId), entities: rows(db, "SELECT id, name, description, status FROM entities WHERE project_id = ? ORDER BY id LIMIT 100", projectId), api_endpoints: rows(db, "SELECT id, method, path, purpose, status FROM api_endpoints WHERE project_id = ? ORDER BY id LIMIT 200", projectId), tasks: rows(db, "SELECT id, title, description, priority, status FROM tasks WHERE project_id = ? ORDER BY id LIMIT 200", projectId), roadmap: rows(db, "SELECT id, name, status FROM roadmaps WHERE project_id = ? ORDER BY created_at DESC LIMIT 5", projectId) };
}
function openAiUrl(baseUrl: string): string { const url = baseUrl || "https://api.openai.com/v1"; const parsed = new URL(url); if (parsed.protocol !== "https:" || parsed.hostname !== "api.openai.com") throw badRequest("Only the official OpenAI API host is allowed for this adapter."); return `${url.replace(/\/$/, "")}/chat/completions`; }

async function generateWithOpenAi(apiKey: string, model: string, snapshot: Record<string, unknown>, instruction: string, baseUrl: string): Promise<{ draft: z.infer<typeof draftSchema>; inputTokens: number; outputTokens: number }> {
  const outputSchema = {
    summary: "string",
    assumptions: ["string"],
    warnings: ["string"],
    requirements: [{ title: "string", description: "string", priority: "low|medium|high|critical" }],
    workflows: [{ name: "string", goal: "string", steps: ["string"] }],
    entities: [{ name: "string", purpose: "string", fields: ["string"] }],
    api_endpoints: [{ method: "GET|POST|PUT|PATCH|DELETE", path: "string", purpose: "string" }],
    roadmap_tasks: [{ title: "string", description: "string", priority: "low|medium|high|critical" }],
    markdown_files: [{ path: "relative markdown path", title: "string", content: "string" }],
  };
  const prompt = JSON.stringify({ instruction, output_schema: outputSchema, project_context: snapshot });
  const response = await fetch(openAiUrl(baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-5-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are Leona, a project-aware software planning agent. Return JSON only matching the requested schema. Propose drafts, never shell commands or executable code. Do not invent facts without placing them in assumptions or warnings." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) { const status = response.status; throw new AppError("BAD_REQUEST", status === 429 ? "The provider rate limit was reached." : `The OpenAI provider returned HTTP ${status}.`, status === 429 ? 429 : 502, { code: status === 429 ? "LEONA_PROVIDER_RATE_LIMIT" : "LEONA_PROVIDER_ERROR" }); }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new AppError("BAD_REQUEST", "The provider returned an empty Leona draft.", 502, { code: "LEONA_EMPTY_DRAFT" });
  let parsed: unknown; try { parsed = JSON.parse(content); } catch { throw new AppError("BAD_REQUEST", "The provider returned invalid structured output.", 502, { code: "LEONA_INVALID_DRAFT" }); }
  return { draft: draftSchema.parse(parsed), inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0 };
}

export function registerLeonaRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, config } = deps;
  app.get("/leona/providers", async (request) => { const user = requireUser(db, request); const rows = db.query("SELECT id, provider, model, base_url, key_last4, status, created_at, updated_at FROM leona_provider_connections WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as ConnectionRow[]; return { data: rows.map(publicRow) }; });
  app.post("/leona/providers", async (request, reply) => { const user = requireUser(db, request); const body = connectionSchema.parse(request.body); const encrypted = encryptKey(body.api_key, config); const id = allocateId(db, "LPRV"); const last4 = body.api_key.slice(-4); db.query("UPDATE leona_provider_connections SET status = 'revoked', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND status = 'active'").run(user.id); db.query("INSERT INTO leona_provider_connections (id, user_id, provider, model, base_url, encrypted_key, iv, auth_tag, key_last4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, user.id, body.provider, body.model, body.base_url ?? "", encrypted.encrypted, encrypted.iv, encrypted.tag, last4); logEvent(db, { entityType: "leona_provider_connection", entityId: id, action: "created", actor: user.id, actorType: "human", payload: { provider: body.provider, model: body.model, keyLast4: last4 } }); reply.code(201); return { data: { id, provider: body.provider, model: body.model, base_url: body.base_url ?? "", key_last4: last4, status: "active" } }; });
  app.delete("/leona/providers/:id", async (request) => { const user = requireUser(db, request); const { id } = idSchema.parse(request.params); const result = db.query("UPDATE leona_provider_connections SET status = 'revoked', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ? AND status = 'active'").run(id, user.id); if (result.changes === 0) throw notFound("Provider connection not found."); logEvent(db, { entityType: "leona_provider_connection", entityId: id, action: "revoked", actor: user.id, actorType: "human" }); return { data: { ok: true } }; });
  app.post("/leona/generate", async (request) => { const user = requireUser(db, request); const body = generationSchema.parse(request.body); assertProjectAccess(db, body.project_id, user.id, "viewer"); const connection = (body.connection_id ? db.query("SELECT * FROM leona_provider_connections WHERE id = ? AND user_id = ? AND status = 'active'").get(body.connection_id, user.id) : db.query("SELECT * FROM leona_provider_connections WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1").get(user.id)) as ConnectionRow | undefined; if (!connection) throw notFound("An active BYOK provider connection is required."); if (connection.provider !== "openai") throw badRequest("The first Leona adapter supports OpenAI BYOK connections only."); const runId = allocateId(db, "LGRN"); db.query("INSERT INTO leona_generation_runs (id, project_id, user_id, provider, model, status) VALUES (?, ?, ?, ?, ?, 'running')").run(runId, body.project_id, user.id, connection.provider, connection.model || "gpt-5-mini"); try { const result = await generateWithOpenAi(decryptKey(connection, config), connection.model, projectSnapshot(db, body.project_id), body.instruction, connection.base_url); db.query("UPDATE leona_generation_runs SET status = 'draft', input_tokens = ?, output_tokens = ?, draft_json = ?, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(result.inputTokens, result.outputTokens, JSON.stringify(result.draft), runId); logEvent(db, { entityType: "leona_generation_run", entityId: runId, action: "draft_created", actor: user.id, actorType: "human", payload: { projectId: body.project_id, provider: connection.provider, model: connection.model || "gpt-5-mini", inputTokens: result.inputTokens, outputTokens: result.outputTokens } }); return { data: { run_id: runId, project_id: body.project_id, provider: connection.provider, model: connection.model || "gpt-5-mini", status: "draft", usage: { input_tokens: result.inputTokens, output_tokens: result.outputTokens }, draft: result.draft } }; } catch (error) { db.query("UPDATE leona_generation_runs SET status = 'failed', error_code = ?, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(error instanceof AppError ? error.code : "LEONA_PROVIDER_ERROR", runId); throw error; } });
}
