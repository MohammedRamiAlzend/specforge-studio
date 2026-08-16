import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Deps } from "../../types";
import { allocateId } from "../../utils/ids";
import { logEvent } from "../../utils/events";
import { assertProjectExists } from "../../utils/exists";
import { notFound } from "../../utils/errors";
import { generateWorkspaceFiles, type WorkspaceFile } from "./workspace";
import { createZip } from "../../utils/zip";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const generateSchema = z.object({
  project_id: z.string().regex(/^PRJ-\d{4,}$/),
});

const exportIdSchema = z.object({ id: z.string().regex(/^DOCS-\d{4,}$/) });

const listQuerySchema = z.object({ project: z.string().regex(/^PRJ-\d{4,}$/).optional() });

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface DocsExportRow {
  id: string;
  project_id: string;
  status: string;
  file_count: number;
  files: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

interface FileMeta {
  path: string;
  bytes: number;
}

function rowToApi(row: DocsExportRow) {
  return {
    id: row.id,
    project_id: row.project_id,
    status: row.status,
    file_count: row.file_count,
    files: JSON.parse(row.files) as FileMeta[],
    generated_at: row.generated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function exportDir(config: Deps["config"], exportId: string): string {
  return resolve(join(config.EXPORT_DIR, exportId));
}

function readExportFiles(dir: string, meta: FileMeta[]): WorkspaceFile[] {
  return meta.map((file) => ({
    path: file.path,
    content: readFileSync(join(dir, file.path), "utf8"),
    bytes: file.bytes,
  }));
}

function writeExportFiles(dir: string, files: WorkspaceFile[]): void {
  for (const file of files) {
    const fullPath = join(dir, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content, "utf8");
  }
}

function listExports(db: Database, projectId?: string): DocsExportRow[] {
  return db
    .query("SELECT * FROM docs_exports WHERE (? IS NULL OR project_id = ?) ORDER BY created_at DESC")
    .all(projectId ?? null, projectId ?? null) as DocsExportRow[];
}

function getExportRow(db: Database, id: string): DocsExportRow {
  const row = db.query("SELECT * FROM docs_exports WHERE id = ?").get(id) as DocsExportRow | undefined;
  if (!row) throw notFound(`Docs export ${id} not found`);
  return row;
}

function latestGeneratedExport(db: Database, projectId: string): DocsExportRow | null {
  const row = db
    .query("SELECT * FROM docs_exports WHERE project_id = ? AND status = 'generated' ORDER BY created_at DESC LIMIT 1")
    .get(projectId) as DocsExportRow | undefined;
  return row ?? null;
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerDocsGeneratorRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, config } = deps;

  app.get("/docs/exports", async (request) => {
    const query = listQuerySchema.parse(request.query);
    return { data: listExports(db, query.project).map(rowToApi) };
  });

  app.get("/docs/exports/:id", async (request) => {
    const { id } = exportIdSchema.parse(request.params);
    const row = getExportRow(db, id);
    const dir = exportDir(config, id);
    const files = readExportFiles(dir, JSON.parse(row.files) as FileMeta[]);
    return { data: { ...rowToApi(row), files } };
  });

  app.get("/docs/exports/:id/download", async (request, reply) => {
    const { id } = exportIdSchema.parse(request.params);
    const row = getExportRow(db, id);
    const dir = exportDir(config, id);
    const files = readExportFiles(dir, JSON.parse(row.files) as FileMeta[]);
    const archive = createZip(files.map((f) => ({ path: f.path, content: f.content })));
    const filename = `specforge-workspace-${id}.zip`;
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    logEvent(db, {
      projectId: row.project_id,
      entityType: "docs_export",
      entityId: id,
      action: "downloaded",
      payload: { fileCount: files.length, bytes: archive.length },
    });
    return reply.send(archive);
  });

  app.post("/docs/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);
    assertProjectExists(db, body.project_id);

    // Preserve manually edited sections: reuse protected files from the latest export.
    const previous = latestGeneratedExport(db, body.project_id);
    const preserveFrom = previous
      ? readExportFiles(exportDir(config, previous.id), JSON.parse(previous.files) as FileMeta[])
      : undefined;

    const files = generateWorkspaceFiles(db, body.project_id, {
      preserveFrom,
      exportDate: new Date().toISOString().slice(0, 10),
    });

    const id = allocateId(db, "DOCS", body.project_id);
    const dir = exportDir(config, id);
    mkdirSync(dir, { recursive: true });
    writeExportFiles(dir, files);

    db.transaction(() => {
      db.query("UPDATE docs_exports SET status = 'superseded', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE project_id = ? AND status = 'generated'").run(body.project_id);
      db.query(
        `INSERT INTO docs_exports (id, project_id, status, file_count, files, generated_at)
         VALUES (?, ?, 'generated', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      ).run(
        id,
        body.project_id,
        files.length,
        JSON.stringify(files.map((f) => ({ path: f.path, bytes: f.bytes }))),
      );
    })();

    logEvent(db, {
      projectId: body.project_id,
      entityType: "docs_export",
      entityId: id,
      action: "generated",
      payload: { fileCount: files.length },
    });

    const row = getExportRow(db, id);
    reply.code(201);
    return { data: { ...rowToApi(row), files } };
  });

  app.delete("/docs/exports/:id", async (request, reply) => {
    const { id } = exportIdSchema.parse(request.params);
    const row = getExportRow(db, id);
    db.query("DELETE FROM docs_exports WHERE id = ?").run(id);
    rmSync(exportDir(config, id), { recursive: true, force: true });
    logEvent(db, {
      projectId: row.project_id,
      entityType: "docs_export",
      entityId: id,
      action: "updated",
      payload: { deleted: true },
    });
    reply.code(204);
    return null;
  });
}
