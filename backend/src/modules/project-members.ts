import type { FastifyInstance } from "fastify";
import type { Database } from "bun:sqlite";
import { z } from "zod";
import type { Deps } from "../types";
import { requireUser } from "./auth";
import { assertProjectAccess } from "./projects";
import { allocateId } from "../utils/ids";
import { conflict, notFound } from "../utils/errors";

const projectIdSchema = z.object({ projectId: z.string().regex(/^PRJ-\d{4,}$/) });
const memberIdSchema = projectIdSchema.extend({ userId: z.string().regex(/^USR-\d{4,}$/) });
const addMemberSchema = z.object({ user_id: z.string().regex(/^USR-\d{4,}$/).optional(), email: z.string().email().optional(), role: z.enum(["editor", "viewer"]).default("viewer") }).refine((value) => value.user_id || value.email, { message: "Provide user_id or email." });
const roleSchema = z.object({ role: z.enum(["editor", "viewer"]) });

interface MemberRow {
  user_id: string;
  email: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
}

function projectExists(db: Database, projectId: string): boolean {
  return Boolean(db.query("SELECT 1 FROM projects WHERE id = ?").get(projectId));
}

function resolveUserId(db: Database, input: z.infer<typeof addMemberSchema>): string {
  const row = input.user_id
    ? db.query("SELECT id FROM users WHERE id = ?").get(input.user_id) as { id: string } | undefined
    : db.query("SELECT id FROM users WHERE email = ?").get(input.email ?? "") as { id: string } | undefined;
  if (!row) throw notFound("User not found");
  return row.id;
}

function listMembers(db: Database, projectId: string): MemberRow[] {
  return db.query(
    `SELECT pm.user_id, u.email, u.name, pm.role, pm.created_at, pm.updated_at
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ? ORDER BY CASE pm.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.name`,
  ).all(projectId) as MemberRow[];
}

export function registerProjectMemberRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/projects/:projectId/members", async (request) => {
    const { projectId } = projectIdSchema.parse(request.params);
    const user = requireUser(db, request);
    assertProjectAccess(db, projectId, user.id);
    return { data: listMembers(db, projectId) };
  });

  app.post("/projects/:projectId/members", async (request, reply) => {
    const { projectId } = projectIdSchema.parse(request.params);
    const user = requireUser(db, request);
    assertProjectAccess(db, projectId, user.id, "owner");
    if (!projectExists(db, projectId)) throw notFound(`Project ${projectId} not found`);
    const body = addMemberSchema.parse(request.body);
    const memberId = resolveUserId(db, body);
    if (db.query("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, memberId)) {
      throw conflict("User is already a project member.");
    }
    db.query("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)").run(projectId, memberId, body.role);
    reply.code(201);
    return { data: listMembers(db, projectId).find((member) => member.user_id === memberId) };
  });

  app.patch("/projects/:projectId/members/:userId", async (request) => {
    const { projectId, userId } = memberIdSchema.parse(request.params);
    const user = requireUser(db, request);
    assertProjectAccess(db, projectId, user.id, "owner");
    const body = roleSchema.parse(request.body);
    const result = db.query("UPDATE project_members SET role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE project_id = ? AND user_id = ? AND role <> 'owner'").run(body.role, projectId, userId);
    if (result.changes === 0) throw notFound("Project member not found or is the owner.");
    return { data: listMembers(db, projectId).find((member) => member.user_id === userId) };
  });

  app.delete("/projects/:projectId/members/:userId", async (request, reply) => {
    const { projectId, userId } = memberIdSchema.parse(request.params);
    const user = requireUser(db, request);
    assertProjectAccess(db, projectId, user.id, "owner");
    const result = db.query("DELETE FROM project_members WHERE project_id = ? AND user_id = ? AND role <> 'owner'").run(projectId, userId);
    if (result.changes === 0) throw notFound("Project member not found or is the owner.");
    reply.code(204);
    return null;
  });
}
