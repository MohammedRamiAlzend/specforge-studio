/**
 * Docs ZIP download tests (Prompt 19).
 * GET /docs/exports/:id/download must return a valid ZIP whose entries match
 * the stored workspace files (same paths, same order, same content), with
 * correct Content-Type / Content-Disposition, and 404 for unknown ids.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { inflateRawSync } from "node:zlib";
import { rmSync } from "node:fs";
import { bootApp, createTestContext, request, seedProject } from "./helpers";

const ctx = createTestContext();
let app: Awaited<ReturnType<typeof bootApp>>;
let projectId = "";
let exportId = "";

beforeAll(async () => {
  app = await bootApp(ctx);
  projectId = await seedProject(app);
  const res = await request(app, "POST", "/docs/generate", { project_id: projectId });
  expect(res.statusCode).toBe(201);
  exportId = res.json().data.id as string;
});

afterAll(async () => {
  await app.close();
  rmSync(ctx.config.EXPORT_DIR, { recursive: true, force: true });
});

interface ZipEntry {
  name: string;
  content: Buffer;
}

/**
 * Minimal ZIP reader for assertions: walks local entries by reading the
 * local file header and deflated payload, then inflates each payload.
 */
function readZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLength = buf.readUInt16LE(offset + 26);
    const extraLength = buf.readUInt16LE(offset + 28);
    const name = buf.toString("utf8", offset + 30, offset + 30 + nameLength);
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buf.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? inflateRawSync(data) : Buffer.from(data);
    entries.push({ name, content });
    offset = dataStart + compressedSize;
  }
  return entries;
}

describe("docs ZIP download", () => {
  it("returns application/zip with attachment Content-Disposition", async () => {
    const res = await app.inject({ method: "GET", url: `/docs/exports/${exportId}/download` });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
    const disposition = res.headers["content-disposition"] as string;
    expect(disposition.startsWith("attachment;")).toBe(true);
    expect(disposition).toContain(`specforge-workspace-${exportId}.zip`);
    expect(res.rawPayload.subarray(0, 4).toString("latin1")).toBe("PK\x03\x04");
  });

  it("contains exactly the stored files in the same order with matching content", async () => {
    const detail = await request(app, "GET", `/docs/exports/${exportId}`);
    const files = detail.json().data.files as { path: string; content: string }[];

    const res = await app.inject({ method: "GET", url: `/docs/exports/${exportId}/download` });
    const entries = readZipEntries(res.rawPayload);

    expect(entries.length).toBe(files.length);
    entries.forEach((entry, index) => {
      const file = files[index];
      expect(file).toBeDefined();
      if (!file) return;
      expect(entry.name).toBe(file.path);
    });
    entries.forEach((entry, index) => {
      const file = files[index];
      expect(file).toBeDefined();
      if (!file) return;
      expect(entry.content.toString("utf8")).toBe(file.content);
    });
  });

  it("returns 404 for an unknown export id", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/exports/DOCS-9999/download" });
    expect(res.statusCode).toBe(404);
  });
});