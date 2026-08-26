import type { FastifyInstance } from "fastify";
import type { Database } from "bun:sqlite";
import { createCipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Deps } from "../types";
import { requireUser } from "./auth";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { AppError, notFound } from "../utils/errors";

const providerSchema = z.enum(["openai", "anthropic", "gemini"]);
const connectionSchema = z.object({
  provider: providerSchema,
  model: z.string().max(120).trim().default(""),
  base_url: z.string().url().max(500).optional(),
  api_key: z.string().min(12).max(500),
});
const idSchema = z.object({ id: z.string().regex(/^LPRV-\d{4,}$/) });

type ConnectionRow = {
  id: string;
  provider: z.infer<typeof providerSchema>;
  model: string;
  base_url: string;
  key_last4: string;
  status: "active" | "revoked";
  created_at: string;
  updated_at: string;
};

function keyBytes(config: Deps["config"]): Buffer {
  const raw = (config as Deps["config"] & { LEONA_CREDENTIAL_KEY?: string }).LEONA_CREDENTIAL_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new AppError("INTERNAL_ERROR", "Leona provider credential storage is not configured.", 503, { code: "LEONA_CREDENTIAL_STORAGE_NOT_CONFIGURED" });
  return Buffer.from(raw, "hex");
}

function encryptKey(apiKey: string, config: Deps["config"]): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(config), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

function publicRow(row: ConnectionRow) {
  return { id: row.id, provider: row.provider, model: row.model, base_url: row.base_url, key_last4: row.key_last4, status: row.status, created_at: row.created_at, updated_at: row.updated_at };
}

export function registerLeonaRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, config } = deps;

  app.get("/leona/providers", async (request) => {
    const user = requireUser(db, request);
    const rows = db.query("SELECT id, provider, model, base_url, key_last4, status, created_at, updated_at FROM leona_provider_connections WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as ConnectionRow[];
    return { data: rows.map(publicRow) };
  });

  app.post("/leona/providers", async (request, reply) => {
    const user = requireUser(db, request);
    const body = connectionSchema.parse(request.body);
    const encrypted = encryptKey(body.api_key, config);
    const id = allocateId(db, "LPRV");
    const last4 = body.api_key.slice(-4);
    db.query("UPDATE leona_provider_connections SET status = 'revoked', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND status = 'active'").run(user.id);
    db.query("INSERT INTO leona_provider_connections (id, user_id, provider, model, base_url, encrypted_key, iv, auth_tag, key_last4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, user.id, body.provider, body.model, body.base_url ?? "", encrypted.encrypted, encrypted.iv, encrypted.tag, last4);
    logEvent(db, { entityType: "leona_provider_connection", entityId: id, action: "created", actor: user.id, actorType: "human", payload: { provider: body.provider, model: body.model, keyLast4: last4 } });
    reply.code(201);
    return { data: { id, provider: body.provider, model: body.model, base_url: body.base_url ?? "", key_last4: last4, status: "active" } };
  });

  app.delete("/leona/providers/:id", async (request) => {
    const user = requireUser(db, request);
    const { id } = idSchema.parse(request.params);
    const result = db.query("UPDATE leona_provider_connections SET status = 'revoked', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ? AND status = 'active'").run(id, user.id);
    if (result.changes === 0) throw notFound("Provider connection not found.");
    logEvent(db, { entityType: "leona_provider_connection", entityId: id, action: "revoked", actor: user.id, actorType: "human" });
    return { data: { ok: true } };
  });
}
